import { ProviderType } from '../shared/protocol';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (chunk: string) => void;
  onError: (error: Error) => void;
  onFinish: (fullResponse: string) => void;
}

export interface StreamOptions {
  abortSignal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
}

export interface ILLMProvider {
  readonly id: ProviderType;
  readonly name: string;
  listModels(): { id: string; name: string; contextWindow?: string }[];
  streamChat(
    messages: LLMMessage[],
    model: string,
    apiKey: string,
    callbacks: StreamCallbacks,
    options?: StreamOptions
  ): Promise<void>;
}
