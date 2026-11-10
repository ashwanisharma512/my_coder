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

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const openaiMessages = messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    const targetModel = model || 'openai/gpt-oss-120b';
    // Qwen 3.8 27B free tier enforces a strict 1000 OTPM cap; stay safely beneath it by default
    let maxTokens = options?.maxTokens ?? (targetModel.includes('qwen') ? 900 : 2048);

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (options?.abortSignal?.aborted) {
        return;
      }

      try {
        const stream = await client.chat.completions.create(
          {
            model: targetModel,
            messages: openaiMessages,
            stream: true,
            temperature: options?.temperature ?? 0.3,
            max_tokens: maxTokens,
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
        return;
      } catch (err: any) {
        if (options?.abortSignal?.aborted) {
          return;
        }

        let rawMsg = err instanceof Error ? err.message : String(err);

        // Automatically shrink max_tokens and retry if Groq rejects expected output tokens over OTPM limit
        const limitMatch = rawMsg.match(/Limit\s+(\d+),\s+Requested\s+(\d+)/i);
        if (limitMatch && rawMsg.includes('reduce max_tokens') && attempt < maxAttempts) {
          const allowedLimit = parseInt(limitMatch[1], 10);
          maxTokens = Math.max(256, Math.floor(allowedLimit * 0.85));
          continue;
        }

        // Handle short transient rate limit cooldowns (<= 8s) automatically
        const waitMatch = rawMsg.match(/try again in\s+(\d+(?:\.\d+)?)s/i);
        if ((err?.status === 429 || rawMsg.includes('429')) && waitMatch && attempt < maxAttempts) {
          const waitSec = parseFloat(waitMatch[1]);
          if (waitSec > 0 && waitSec <= 8) {
            await new Promise((r) => setTimeout(r, (waitSec + 0.5) * 1000));
            continue;
          }
        }

        if (rawMsg.includes('does not exist or you do not have access to it')) {
          rawMsg = `The model '${targetModel}' was not found or your Groq API key does not have access to it.\n\n` +
            `• Verify your Groq API key at https://console.groq.com/keys (Groq keys start with 'gsk_').\n` +
            `• Try selecting 'GPT OSS 120B (Tools, Reasoning)' or 'GPT OSS 20B (Fast, Tools)' from the top dropdown.`;
        } else if (err?.status === 429 || rawMsg.includes('429')) {
          rawMsg = `Groq Rate Limit (429) on '${targetModel}':\n${rawMsg}\n\n` +
            `💡 Tip: Different Groq models have separate rate-limit buckets. Try switching to 'GPT OSS 120B (Tools, Reasoning)' or 'GPT OSS 20B (Fast, Tools)' in the dropdown above, or wait a few seconds and retry.`;
        }

        callbacks.onError(new Error(rawMsg));
        return;
      }
    }
  }
}
