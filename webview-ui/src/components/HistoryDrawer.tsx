import React from 'react';
import { X, MessageSquare, Trash2, Plus, Clock } from 'lucide-react';
import { SessionSummary } from '../../../src/shared/protocol';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionSummary[];
  activeSessionId?: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewSession: () => void;
}

function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-start select-none">
      <div className="bg-vscode-bg border-r border-vscode-border shadow-2xl w-full max-w-[280px] h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-vscode-border bg-vscode-sidebg">
          <div className="flex items-center gap-2 font-medium text-xs">
            <Clock className="w-4 h-4 text-vscode-btnBg" />
            <span className="text-vscode-fg font-semibold">Chat History</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-vscode-inputBg rounded text-vscode-sidefg hover:text-vscode-fg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action: New Chat */}
        <div className="p-2 border-b border-vscode-border bg-vscode-sidebg/50">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-vscode-btnBg text-vscode-btnFg hover:bg-vscode-btnHover text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-vscode-sidefg text-xs">
              No saved conversations yet.
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelectSession(s.id);
                    onClose();
                  }}
                  className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs border ${
                    isActive
                      ? 'bg-vscode-inputBg border-vscode-btnBg text-vscode-fg'
                      : 'border-transparent hover:bg-vscode-sidebg text-vscode-sidefg hover:text-vscode-fg'
                  }`}
                >
                  <div className="flex items-start gap-2 overflow-hidden flex-1 min-w-0 pr-1">
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-vscode-btnBg" />
                    <div className="flex flex-col overflow-hidden truncate">
                      <span className="font-medium truncate text-vscode-fg">
                        {s.title}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                        <span>{formatTimeAgo(s.updatedAt)}</span>
                        <span>•</span>
                        <span>{s.messageCount} msgs</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-950/60 text-red-400 rounded transition-opacity flex-shrink-0"
                    title="Delete session"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
