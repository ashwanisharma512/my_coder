import OpenAI from 'openai';
import { ILLMProvider, LLMMessage, StreamCallbacks, StreamOptions } from './types';

export class OpenAIProvider implements ILLMProvider {
  public readonly id = 'openai';
  public readonly name = 'OpenAI';

  public listModels() {
    return [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: '128k' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: '128k' },
      { id: 'o3-mini', name: 'o3-mini (Reasoning)', contextWindow: '200k' },
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
      });

      const openaiMessages = messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

      const stream = await client.chat.completions.create(
        {
          model: model || 'gpt-4o',
          messages: openaiMessages,
          stream: true,
          temperature: model.startsWith('o') ? undefined : (options?.temperature ?? 0.3),
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
