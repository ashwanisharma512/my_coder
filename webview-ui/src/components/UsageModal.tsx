import React from 'react';
import { X, Activity, FileText, RotateCcw, Clock, Calendar } from 'lucide-react';
import { ProviderType, UsageStats } from '../../../src/shared/protocol';

interface UsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageStats: UsageStats;
  onOpenLogs: () => void;
  onResetUsage: () => void;
}

export const UsageModal: React.FC<UsageModalProps> = ({
  isOpen,
  onClose,
  usageStats,
  onOpenLogs,
  onResetUsage,
}) => {
  if (!isOpen) return null;

  const providers: { id: ProviderType; name: string }[] = [
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'anthropic', name: 'Anthropic Claude' },
    { id: 'openai', name: 'OpenAI' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="bg-vscode-bg border border-vscode-border rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-vscode-border bg-vscode-sidebg">
          <div className="flex items-center gap-2 font-medium text-xs">
            <Activity className="w-4 h-4 text-vscode-btnBg" />
            <span className="text-vscode-fg font-semibold">API Usage & Rate Monitor</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-vscode-inputBg rounded text-vscode-sidefg hover:text-vscode-fg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-vscode-sidebg rounded border border-vscode-border flex flex-col">
              <span className="text-[11px] text-vscode-sidefg flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Calls This Hour
              </span>
              <span className="text-2xl font-bold text-vscode-fg">
                {usageStats.callsThisHour}
              </span>
              <span className="text-[10px] text-neutral-400 truncate mt-1">
                {usageStats.currentHourLabel}
              </span>
            </div>

            <div className="p-3 bg-vscode-sidebg rounded border border-vscode-border flex flex-col">
              <span className="text-[11px] text-vscode-sidefg flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Calls Today
              </span>
              <span className="text-2xl font-bold text-vscode-fg">
                {usageStats.callsToday}
              </span>
              <span className="text-[10px] text-neutral-400 truncate mt-1">
                {usageStats.currentDayLabel}
              </span>
            </div>
          </div>

          {/* Provider Breakdown Table */}
          <div className="bg-vscode-sidebg rounded border border-vscode-border p-3 space-y-2">
            <span className="font-semibold text-vscode-fg text-[11px] block">
              Breakdown by Provider
            </span>
            <div className="divide-y divide-vscode-border/60">
              {providers.map((p) => {
                const data = usageStats.byProvider?.[p.id] || { hour: 0, day: 0 };
                return (
                  <div key={p.id} className="py-2 flex items-center justify-between">
                    <span className="text-vscode-fg font-medium">{p.name}</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-vscode-sidefg">
                        Hr: <strong className="text-vscode-fg">{data.hour}</strong>
                      </span>
                      <span className="text-vscode-sidefg">
                        Day: <strong className="text-vscode-fg">{data.day}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Log File Access */}
          <div className="p-3 bg-vscode-sidebg rounded border border-vscode-border flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium text-vscode-fg">Local Audit Log</span>
              <span className="text-[10px] text-vscode-sidefg">
                Recorded in .my_coder/logs/requests_*.jsonl
              </span>
            </div>
            <button
              onClick={() => {
                onOpenLogs();
                onClose();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-vscode-btnBg text-vscode-btnFg hover:bg-vscode-btnHover rounded transition-colors text-[11px] font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open Log File</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-vscode-border bg-vscode-sidebg flex justify-between items-center">
          <button
            onClick={onResetUsage}
            className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 p-1 rounded"
            title="Reset usage counter"
          >
            <RotateCcw className="w-3 h-3" /> Reset Counter
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-vscode-btnSecondaryBg text-vscode-btnSecondaryFg hover:opacity-90 rounded text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
