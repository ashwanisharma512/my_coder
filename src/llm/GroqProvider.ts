import OpenAI from 'openai';
import { ILLMProvider, LLMMessage, StreamCallbacks, StreamOptions } from './types';

export class GroqProvider implements ILLMProvider {
  public readonly id = 'groq';
  public readonly name = 'Groq Cloud (Fast & Free)';

  public listModels() {
    return [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Free)', contextWindow: '128k' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Free)', contextWindow: '128k' },
      { id: 'qwen-2.5-32b', name: 'Qwen 2.5 32B (Free)', contextWindow: '128k' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Free)', contextWindow: '32k' },
    ];
  }

  public async streamChat(
    messages: LLMMessage[],
    model: string,
    apiKey: string,
    callbacks: StreamCallbacks,
    options?: StreamOptions
  ): Promise<void> {
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      const openaiMessages = messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

      const stream = await client.chat.completions.create(
        {
          model: model || 'llama-3.3-70b-versatile',
          messages: openaiMessages,
          stream: true,
          temperature: options?.temperature ?? 0.3,
        },
        {
          signal: options?.abortSignal,
        }
      );

      let accumulated = '';

      for await (const chunk of stream) {
        if (options?.abortSignal?.aborted) {
          return;
        }
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          accumulated += delta;
          callbacks.onToken(delta);
        }
      }

      callbacks.onFinish(accumulated);
    } catch (err: any) {
      if (options?.abortSignal?.aborted) {
        return;
      }
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
