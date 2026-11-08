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

      const responseStream = await ai.models.generateContentStream({
        model: chosenModel,
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature: options?.temperature ?? 0.3,
          maxOutputTokens: options?.maxTokens || 4096,
        },
      });

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
      callbacks.onError(new Error(rawMsg));
    }
  }
}
