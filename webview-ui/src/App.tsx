import { useState, useEffect } from 'react';
import { getVsCodeApi } from './vscode';
import { Header } from './components/Header';
import { ContextBanner } from './components/ContextBanner';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { SettingsModal } from './components/SettingsModal';
import { UsageModal } from './components/UsageModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import {
  ActiveContext,
  ChatMessage,
  ExtensionMessage,
  ModelOption,
  ProviderType,
  SessionSummary,
  UsageStats,
} from '../../src/shared/protocol';

export function App() {
  const vscode = getVsCodeApi();

  const [models, setModels] = useState<ModelOption[]>([
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'gemini' },
    { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro', provider: 'gemini' },
    { id: 'gemini-3.8-flash-lite', name: 'Gemini 3.8 Flash Lite', provider: 'gemini' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'anthropic' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  ]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('gemini');

  const [apiKeys, setApiKeys] = useState<Record<ProviderType, boolean>>({
    anthropic: false,
    gemini: false,
    openai: false,
  });

  const [usageStats, setUsageStats] = useState<UsageStats>({
    callsThisHour: 0,
    callsToday: 0,
    byProvider: {
      anthropic: { hour: 0, day: 0 },
      gemini: { hour: 0, day: 0 },
      openai: { hour: 0, day: 0 },
    },
    currentHourLabel: '',
    currentDayLabel: '',
  });

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const [activeContext, setActiveContext] = useState<ActiveContext>({ hasSelection: false });
  const [includeContext, setIncludeContext] = useState<boolean>(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isUsageOpen, setIsUsageOpen] = useState<boolean>(false);

  useEffect(() => {
    // Notify host extension that webview is ready
    vscode.postMessage({ type: 'ready' });

    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'init': {
          setApiKeys(msg.apiKeys);
          setActiveContext(msg.activeContext);
          if (msg.models && msg.models.length > 0) {
            setModels(msg.models);
          }
          if (msg.selectedModel) {
            setSelectedModel(msg.selectedModel);
          }
          if (msg.selectedProvider) {
            setSelectedProvider(msg.selectedProvider);
          }
          if (msg.usageStats) {
            setUsageStats(msg.usageStats);
          }
          if (msg.sessionsList) {
            setSessions(msg.sessionsList);
          }
          if (msg.activeSession) {
            setActiveSessionId(msg.activeSession.id);
            setMessages(msg.activeSession.messages || []);
            if (msg.activeSession.model) {
              setSelectedModel(msg.activeSession.model);
            }
            if (msg.activeSession.provider) {
              setSelectedProvider(msg.activeSession.provider);
            }
          }
          break;
        }

        case 'sessionLoaded': {
          setActiveSessionId(msg.session.id);
          setMessages(msg.session.messages || []);
          if (msg.session.model) {
            setSelectedModel(msg.session.model);
          }
          if (msg.session.provider) {
            setSelectedProvider(msg.session.provider);
          }
          setStreamingText('');
          setIsStreaming(false);
          break;
        }

        case 'sessionsListUpdated': {
          setSessions(msg.sessions);
          break;
        }

        case 'keysStatusUpdated': {
          setApiKeys(msg.apiKeys);
          break;
        }

        case 'contextUpdated': {
          setActiveContext(msg.activeContext);
          break;
        }

        case 'usageStatsUpdated': {
          setUsageStats(msg.usageStats);
          break;
        }

        case 'streamToken': {
          setStreamingText((prev) => prev + msg.token);
          break;
        }

        case 'streamEnd': {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: msg.fullText,
              timestamp: Date.now(),
            },
          ]);
          setStreamingText('');
          setIsStreaming(false);
          break;
        }

        case 'streamError': {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `⚠️ **Error:** ${msg.error}`,
              timestamp: Date.now(),
            },
          ]);
          setStreamingText('');
          setIsStreaming(false);
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSend = (textToSend?: string) => {
    const text = textToSend ?? input;
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreamingText('');
    setIsStreaming(true);

    vscode.postMessage({
      type: 'sendMessage',
      text: userMsg.content,
      provider: selectedProvider,
      model: selectedModel,
      context: includeContext ? activeContext : undefined,
    });
  };

  const handleAbort = () => {
    vscode.postMessage({ type: 'abortStream' });
    setIsStreaming(false);
    if (streamingText) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: streamingText + '\n\n*(Generation stopped)*',
          timestamp: Date.now(),
        },
      ]);
      setStreamingText('');
    }
  };

  const handleNewChat = () => {
    if (isStreaming) {
      handleAbort();
    }
    vscode.postMessage({ type: 'newSession' });
  };

  const handleSelectSession = (id: string) => {
    if (isStreaming) {
      handleAbort();
    }
    vscode.postMessage({ type: 'loadSession', sessionId: id });
  };

  const handleDeleteSession = (id: string) => {
    vscode.postMessage({ type: 'deleteSession', sessionId: id });
  };

  const handleSaveApiKey = (provider: ProviderType, key: string) => {
    vscode.postMessage({
      type: 'saveApiKey',
      provider,
      apiKey: key,
    });
  };

  const handleRemoveApiKey = (provider: ProviderType) => {
    vscode.postMessage({
      type: 'removeApiKey',
      provider,
    });
  };

  const handleRefreshContext = () => {
    vscode.postMessage({ type: 'refreshContext' });
  };

  const handleOpenLogs = () => {
    vscode.postMessage({ type: 'openLogFile' });
  };

  const handleResetUsage = () => {
    vscode.postMessage({ type: 'resetUsageStats' });
  };

  return (
    <div className="flex flex-col h-full w-full bg-vscode-bg text-vscode-fg">
      <Header
        models={models}
        selectedModel={selectedModel}
        selectedProvider={selectedProvider}
        apiKeys={apiKeys}
        usageStats={usageStats}
        onSelectModel={(modelId, provider) => {
          setSelectedModel(modelId);
          setSelectedProvider(provider);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUsage={() => setIsUsageOpen(true)}
        onOpenLogs={handleOpenLogs}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onNewChat={handleNewChat}
      />

      <ContextBanner
        context={activeContext}
        includeContext={includeContext}
        onToggleInclude={() => setIncludeContext((prev) => !prev)}
        onRefresh={handleRefreshContext}
      />

      <MessageList
        messages={messages}
        streamingText={streamingText}
        isStreaming={isStreaming}
        onQuickPrompt={(prompt) => handleSend(prompt)}
      />

      <InputArea
        input={input}
        setInput={setInput}
        onSend={() => handleSend()}
        onAbort={handleAbort}
        isStreaming={isStreaming}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKeys={apiKeys}
        onSaveKey={handleSaveApiKey}
        onRemoveKey={handleRemoveApiKey}
        onOpenLogs={handleOpenLogs}
      />

      <UsageModal
        isOpen={isUsageOpen}
        onClose={() => setIsUsageOpen(false)}
        usageStats={usageStats}
        onOpenLogs={handleOpenLogs}
        onResetUsage={handleResetUsage}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewSession={handleNewChat}
      />
    </div>
  );
}
export default App;
