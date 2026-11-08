export type ProviderType = 'anthropic' | 'gemini' | 'openai';

export interface ModelOption {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow?: string;
}

export interface ActiveContext {
  fileName?: string;
  filePath?: string;
  languageId?: string;
  selectedText?: string;
  hasSelection: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ProviderUsage {
  hour: number;
  day: number;
}

export interface UsageStats {
  callsThisHour: number;
  callsToday: number;
  byProvider: Record<ProviderType, ProviderUsage>;
  currentHourLabel: string;
  currentDayLabel: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  messageCount: number;
  provider: ProviderType;
  model: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  provider: ProviderType;
  model: string;
  messages: ChatMessage[];
}

// Webview -> Extension
export type WebviewMessage =
  | { type: 'ready' }
  | {
      type: 'sendMessage';
      text: string;
      provider: ProviderType;
      model: string;
      context?: ActiveContext;
    }
  | { type: 'abortStream' }
  | { type: 'saveApiKey'; provider: ProviderType; apiKey: string }
  | { type: 'removeApiKey'; provider: ProviderType }
  | { type: 'getApiKeysStatus' }
  | { type: 'insertCode'; code: string }
  | { type: 'createNewFile'; code: string; language?: string }
  | { type: 'refreshContext' }
  | { type: 'clearHistory' }
  | { type: 'openLogFile' }
  | { type: 'getUsageStats' }
  | { type: 'resetUsageStats' }
  | { type: 'loadSession'; sessionId: string }
  | { type: 'deleteSession'; sessionId: string }
  | { type: 'newSession' }
  | { type: 'listSessions' };

// Extension -> Webview
export type ExtensionMessage =
  | {
      type: 'init';
      apiKeys: Record<ProviderType, boolean>;
      activeContext: ActiveContext;
      models: ModelOption[];
      selectedModel: string;
      selectedProvider: ProviderType;
      usageStats: UsageStats;
      activeSession?: ChatSession;
      sessionsList?: SessionSummary[];
    }
  | { type: 'streamToken'; token: string }
  | { type: 'streamEnd'; fullText: string }
  | { type: 'streamError'; error: string }
  | { type: 'contextUpdated'; activeContext: ActiveContext }
  | { type: 'keysStatusUpdated'; apiKeys: Record<ProviderType, boolean> }
  | { type: 'usageStatsUpdated'; usageStats: UsageStats }
  | { type: 'sessionLoaded'; session: ChatSession }
  | { type: 'sessionsListUpdated'; sessions: SessionSummary[] };
