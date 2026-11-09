import { GoogleGenAI } from '@google/genai';
import { ILLMProvider, LLMMessage, StreamCallbacks, StreamOptions } from './types';

export class GeminiProvider implements ILLMProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';

  public listModels() {
    return [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', contextWindow: '1M' },
      { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro', contextWindow: '1M' },
      { id: 'gemini-3.8-flash-lite', name: 'Gemini 3.8 Flash Lite', contextWindow: '1M' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: '1M' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: '1M' },
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
      const ai = new GoogleGenAI({
        apiKey,
      });

      let systemInstruction = '';
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemInstruction += (systemInstruction ? '\n\n' : '') + msg.content;
        } else {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          });
        }
      }

      const chosenModel = model || 'gemini-3.8-flash';

      let responseStream;
      const maxRetries = 2;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          responseStream = await ai.models.generateContentStream({
            model: chosenModel,
            contents,
            config: {
              systemInstruction: systemInstruction || undefined,
              temperature: options?.temperature ?? 0.3,
              maxOutputTokens: options?.maxTokens || 4096,
            },
          });
          break;
        } catch (streamErr: any) {
          const errMsg = String(streamErr?.message || streamErr);
          const isTransient =
            errMsg.includes('high demand') ||
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('fetch failed');

          if (isTransient && attempt < maxRetries && !options?.abortSignal?.aborted) {
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
            continue;
          }
          throw streamErr;
        }
      }

      if (!responseStream) {
        throw new Error('Failed to initialize Gemini content stream.');
      }

      let accumulated = '';

      for await (const chunk of responseStream) {
        if (options?.abortSignal?.aborted) {
          return;
        }
        const text = chunk.text || '';
        if (text) {
          accumulated += text;
          callbacks.onToken(text);
        }
      }

      callbacks.onFinish(accumulated);
    } catch (err: any) {
      if (options?.abortSignal?.aborted) {
        return;
      }
      let rawMsg = err instanceof Error ? err.message : String(err);
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed.error?.message) {
          try {
            const inner = JSON.parse(parsed.error.message);
            rawMsg = inner.error?.message || parsed.error.message;
          } catch {
            rawMsg = parsed.error.message;
          }
        }
      } catch {
        // Not JSON formatted
      }

      if (rawMsg.includes('prepayment credits are depleted') || rawMsg.includes('billing#prepay')) {
        rawMsg =
          `Your Google AI Studio project prepayment credits are depleted.\n\n` +
          `• **Option 1 (Refill):** Visit [Google AI Studio Projects](https://ai.studio/projects) to add prepaid credits.\n` +
          `• **Option 2 (Instant Free):** Switch provider in the top dropdown to **Groq Cloud (Fast & Free)**. Get a free API key instantly at [console.groq.com/keys](https://console.groq.com/keys) with fast Llama 3.3 70B & Qwen 2.5!\n` +
          `• **Option 3 (Local Free):** Switch provider to **Ollama** for 100% free local models (zero API keys needed).`;
      }

      callbacks.onError(new Error(rawMsg));
    }
  }
}
