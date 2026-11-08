import * as vscode from 'vscode';
import { ProviderType } from '../shared/protocol';

export class SecretManager {
  private static readonly KEY_PREFIX = 'my_coder_api_key_';

  constructor(private readonly secrets: vscode.SecretStorage) {}

  public async getApiKey(provider: ProviderType): Promise<string | undefined> {
    return this.secrets.get(`${SecretManager.KEY_PREFIX}${provider}`);
  }

  public async setApiKey(provider: ProviderType, apiKey: string): Promise<void> {
    if (!apiKey || apiKey.trim() === '') {
      await this.deleteApiKey(provider);
      return;
    }
    await this.secrets.store(`${SecretManager.KEY_PREFIX}${provider}`, apiKey.trim());
  }

  public async deleteApiKey(provider: ProviderType): Promise<void> {
    await this.secrets.delete(`${SecretManager.KEY_PREFIX}${provider}`);
  }

  public async getKeysStatus(): Promise<Record<ProviderType, boolean>> {
    const [hasAnthropic, hasGemini, hasOpenAI] = await Promise.all([
      this.getApiKey('anthropic').then((k) => !!k && k.length > 0),
      this.getApiKey('gemini').then((k) => !!k && k.length > 0),
      this.getApiKey('openai').then((k) => !!k && k.length > 0),
    ]);

    return {
      anthropic: hasAnthropic,
      gemini: hasGemini,
      openai: hasOpenAI,
    };
  }
}
