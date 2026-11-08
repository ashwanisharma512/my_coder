import OpenAI from 'openai';
import { ILLMProvider, LLMMessage, StreamCallbacks, StreamOptions } from './types';

export class OllamaProvider implements ILLMProvider {
  public readonly id = 'ollama';
  public readonly name = 'Ollama (Local & Free)';
  private baseUrl: string = 'http://localhost:11434/v1';

  public setBaseUrl(url: string) {
    if (url && url.trim()) {
      this.baseUrl = url.trim().replace(/\/$/, '') + (url.endsWith('/v1') ? '' : '/v1');
    }
  }

  public listModels() {
    return [
      { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B (Local)', contextWindow: '32k' },
      { id: 'qwen2.5-coder:14b', name: 'Qwen 2.5 Coder 14B (Local)', contextWindow: '32k' },
      { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2 (Local)', contextWindow: '64k' },
      { id: 'llama3.2', name: 'Llama 3.2 (Local)', contextWindow: '128k' },
    ];
  }

  public async streamChat(
    messages: LLMMessage[],
    model: string,
    _apiKey: string,
    callbacks: StreamCallbacks,
    options?: StreamOptions
  ): Promise<void> {
    try {
      const client = new OpenAI({
        apiKey: 'ollama',
        baseURL: this.baseUrl,
      });

      const openaiMessages = messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

      const stream = await client.chat.completions.create(
        {
          model: model || 'qwen2.5-coder:7b',
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
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        callbacks.onError(
          new Error(
            `Could not connect to Ollama at ${this.baseUrl}. Please ensure Ollama is installed and running ('ollama serve').`
          )
        );
      } else {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }
}
