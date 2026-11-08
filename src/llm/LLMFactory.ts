import { AnthropicProvider } from './AnthropicProvider';
import { GeminiProvider } from './GeminiProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { ILLMProvider } from './types';
import { ModelOption, ProviderType } from '../shared/protocol';

export class LLMFactory {
  private static providers: Map<ProviderType, ILLMProvider> = new Map();

  static {
    const anthropic = new AnthropicProvider();
    const gemini = new GeminiProvider();
    const openai = new OpenAIProvider();

    this.providers.set(anthropic.id, anthropic);
    this.providers.set(gemini.id, gemini);
    this.providers.set(openai.id, openai);
  }

  public static getProvider(provider: ProviderType): ILLMProvider {
    const p = this.providers.get(provider);
    if (!p) {
      throw new Error(`Unknown LLM provider: ${provider}`);
    }
    return p;
  }

  public static getAllModels(): ModelOption[] {
    const models: ModelOption[] = [];
    for (const [providerId, provider] of this.providers.entries()) {
      for (const m of provider.listModels()) {
        models.push({
          id: m.id,
          name: m.name,
          provider: providerId,
          contextWindow: m.contextWindow,
        });
      }
    }
    return models;
  }
}
