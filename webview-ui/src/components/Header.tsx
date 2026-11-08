import React from 'react';
import { Settings, PlusCircle, Sparkles, Activity, FileText, Clock } from 'lucide-react';
import { ModelOption, ProviderType, UsageStats } from '../../../src/shared/protocol';

interface HeaderProps {
  models: ModelOption[];
  selectedModel: string;
  selectedProvider: ProviderType;
  apiKeys: Record<ProviderType, boolean>;
  usageStats?: UsageStats;
  onSelectModel: (modelId: string, provider: ProviderType) => void;
  onOpenSettings: () => void;
  onOpenUsage: () => void;
  onOpenLogs: () => void;
  onOpenHistory: () => void;
  onNewChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  models,
  selectedModel,
  selectedProvider,
  apiKeys,
  usageStats,
  onSelectModel,
  onOpenSettings,
  onOpenUsage,
  onOpenLogs,
  onOpenHistory,
  onNewChat,
}) => {
  const isKeyConfigured = apiKeys[selectedProvider];

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-vscode-border bg-vscode-sidebg select-none gap-2">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Sparkles className="w-4 h-4 text-vscode-btnBg flex-shrink-0" />
        <select
          value={selectedModel}
          onChange={(e) => {
            const found = models.find((m) => m.id === e.target.value);
            if (found) {
              onSelectModel(found.id, found.provider);
            }
          }}
          className="bg-vscode-inputBg text-vscode-inputFg border border-vscode-inputBorder rounded px-2 py-1 text-xs truncate focus:outline-none w-full max-w-[170px]"
          title="Select AI Model"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.provider.toUpperCase()})
            </option>
          ))}
        </select>
        {!isKeyConfigured && (
          <span
            onClick={onOpenSettings}
            className="cursor-pointer text-[10px] text-amber-400 bg-amber-950/60 border border-amber-600/40 px-1.5 py-0.5 rounded flex-shrink-0 hover:underline"
            title="API key missing! Click to configure."
          >
            Key Missing
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Usage Tracker Badge */}
        {usageStats && (
          <button
            onClick={onOpenUsage}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-vscode-inputBg border border-vscode-inputBorder hover:border-vscode-btnBg text-[10px] text-vscode-fg transition-colors"
            title={`Calls Today: ${usageStats.callsToday} | This Hour: ${usageStats.callsThisHour}. Click for details.`}
          >
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>
              {usageStats.callsToday}d / {usageStats.callsThisHour}h
            </span>
          </button>
        )}

        <button
          onClick={onOpenLogs}
          className="p-1 rounded hover:bg-vscode-inputBg text-vscode-sidefg hover:text-vscode-fg transition-colors"
          title="Open Local Request Audit Logs"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenHistory}
          className="p-1 rounded hover:bg-vscode-inputBg text-vscode-sidefg hover:text-vscode-fg transition-colors"
          title="Chat History"
        >
          <Clock className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onNewChat}
          className="p-1 rounded hover:bg-vscode-inputBg text-vscode-sidefg hover:text-vscode-fg transition-colors"
          title="New Chat"
        >
          <PlusCircle className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1 rounded hover:bg-vscode-inputBg text-vscode-sidefg hover:text-vscode-fg transition-colors"
          title="API Keys Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
