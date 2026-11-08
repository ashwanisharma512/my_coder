import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, LLMMessage, StreamCallbacks, StreamOptions } from './types';

export class AnthropicProvider implements ILLMProvider {
  public readonly id = 'anthropic';
  public readonly name = 'Anthropic Claude';

  public listModels() {
    return [
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', contextWindow: '200k' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: '200k' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: '200k' },
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
      const client = new Anthropic({
        apiKey,
      });

      // Anthropic separates system prompt from conversation turns
      let systemPrompt = '';
      const chatMessages: Anthropic.MessageParam[] = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
        } else {
          chatMessages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
      }

      const stream = client.messages.stream(
        {
          model: model || 'claude-3-7-sonnet-20250219',
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature ?? 0.3,
          system: systemPrompt || undefined,
          messages: chatMessages,
        },
        {
          signal: options?.abortSignal,
        }
      );

      let accumulated = '';

      stream.on('text', (text) => {
        accumulated += text;
        callbacks.onToken(text);
      });

      stream.on('error', (err) => {
        callbacks.onError(err);
      });

      await stream.finalMessage();
      callbacks.onFinish(accumulated);
    } catch (err: any) {
      if (options?.abortSignal?.aborted) {
        return;
      }
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
