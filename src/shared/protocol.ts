export type ProviderType = 'anthropic' | 'gemini' | 'openai' | 'groq' | 'ollama';

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
  attachedFiles?: string[];
}

export interface ToolCallEvent {
  id: string;
  name: string;
  args: Record<string, any>;
  status: 'running' | 'completed' | 'error' | 'awaiting_approval';
  output?: string;
  error?: string;
  durationMs?: number;
  diffPath?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallEvent[];
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

export interface AppSettings {
  autoApproveEdits: boolean;
  autoApproveCommands: boolean;
  ollamaBaseUrl: string;
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
  | { type: 'listSessions' }
  | { type: 'approveToolCall'; toolCallId: string }
  | { type: 'denyToolCall'; toolCallId: string }
  | { type: 'updateSettings'; settings: Partial<AppSettings> }
  | { type: 'searchWorkspaceFiles'; query: string };

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
      settings: AppSettings;
      activeSession?: ChatSession;
      sessionsList?: SessionSummary[];
    }
  | { type: 'streamToken'; token: string }
  | { type: 'streamSync'; text: string }
  | { type: 'streamEnd'; fullText: string; toolCalls?: ToolCallEvent[] }
  | { type: 'streamError'; error: string; toolCalls?: ToolCallEvent[]; partialText?: string }
  | { type: 'toolCallStart'; toolCall: ToolCallEvent }
  | { type: 'toolCallEnd'; toolCall: ToolCallEvent }
  | { type: 'contextUpdated'; activeContext: ActiveContext }
  | { type: 'keysStatusUpdated'; apiKeys: Record<ProviderType, boolean> }
  | { type: 'usageStatsUpdated'; usageStats: UsageStats }
  | { type: 'sessionLoaded'; session: ChatSession }
  | { type: 'sessionsListUpdated'; sessions: SessionSummary[] }
  | { type: 'settingsUpdated'; settings: AppSettings }
  | { type: 'workspaceFilesResult'; files: string[] };
