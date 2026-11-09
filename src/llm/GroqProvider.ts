import OpenAI from 'openai';
import { ILLMProvider, LLMMessage, StreamCallbacks, StreamOptions } from './types';

export class GroqProvider implements ILLMProvider {
  public readonly id = 'groq';
  public readonly name = 'Groq Cloud (Fast & Free)';

  public listModels() {
    return [
      { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B (Tools, Reasoning)', contextWindow: '131k' },
      { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B (Fast, Tools)', contextWindow: '131k' },
      { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (Tools, Reasoning)', contextWindow: '131k' },
      { id: 'allam-2-7b', name: 'ALLaM 2 7B', contextWindow: '4k' },
    ];
  }

  public async streamChat(
    messages: LLMMessage[],
    model: string,
    apiKey: string,
    callbacks: StreamCallbacks,
    options?: StreamOptions
  ): Promise<void> {
    if (apiKey.startsWith('sk-proj-') || (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-') && !apiKey.startsWith('gsk_'))) {
      callbacks.onError(new Error(
        `The API key configured for Groq is an OpenAI key (starts with '${apiKey.slice(0, 7)}...').\n\n` +
        `• Groq requires its own free API key starting with 'gsk_'.\n` +
        `• Get your free Groq key instantly at https://console.groq.com/keys.\n` +
        `• Click the gear icon in My Coder and paste it into the Groq field.`
      ));
      return;
    }

    if (apiKey.startsWith('AIzaSy')) {
      callbacks.onError(new Error(
        `The API key configured for Groq is a Google Gemini key (starts with 'AIzaSy...').\n\n` +
        `• Groq requires its own free API key starting with 'gsk_'.\n` +
        `• Get your free Groq key instantly at https://console.groq.com/keys and paste it in Settings.`
      ));
      return;
    }

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
          model: model || 'openai/gpt-oss-120b',
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
      let rawMsg = err instanceof Error ? err.message : String(err);
      if (rawMsg.includes('does not exist or you do not have access to it')) {
        rawMsg = `The model '${model}' was not found or your Groq API key does not have access to it.\n\n` +
          `• Verify your Groq API key at https://console.groq.com/keys (Groq keys start with 'gsk_').\n` +
          `• Try selecting 'Llama 3.3 70B Versatile (Free)' or 'Qwen 2.5 32B (Free)' from the top dropdown.`;
      }
      callbacks.onError(new Error(rawMsg));
    }
  }
}
