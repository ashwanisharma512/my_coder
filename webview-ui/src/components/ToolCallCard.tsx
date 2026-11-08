import React, { useState } from 'react';
import {
  FileText,
  Terminal,
  Folder,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Check,
  X,
} from 'lucide-react';
import { ToolCallEvent } from '../../../src/shared/protocol';

interface ToolCallCardProps {
  toolCall: ToolCallEvent;
  onApprove?: (toolCallId: string) => void;
  onDeny?: (toolCallId: string) => void;
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolCall,
  onApprove,
  onDeny,
}) => {
  const [expanded, setExpanded] = useState(toolCall.status === 'awaiting_approval');

  const getToolIcon = () => {
    switch (toolCall.name) {
      case 'read_file':
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'write_file':
      case 'edit_file':
        return <Edit3 className="w-3.5 h-3.5 text-purple-400" />;
      case 'list_files':
        return <Folder className="w-3.5 h-3.5 text-amber-400" />;
      case 'execute_command':
        return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (toolCall.status) {
      case 'awaiting_approval':
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-600/40 px-1.5 py-0.5 rounded">
            <ShieldAlert className="w-3 h-3" /> Awaiting Approval
          </span>
        );
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[10px] text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Running...
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Done
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[10px] text-red-400">
            <AlertCircle className="w-3 h-3" /> Error
          </span>
        );
    }
  };

  const primaryArg =
    toolCall.args?.filePath ||
    toolCall.args?.command ||
    toolCall.args?.directory ||
    '';

  const isAwaiting = toolCall.status === 'awaiting_approval';

  return (
    <div
      className={`my-1.5 rounded border text-xs overflow-hidden select-text transition-colors ${
        isAwaiting
          ? 'border-amber-600/60 bg-amber-950/20'
          : 'border-vscode-border bg-vscode-sidebg/60'
      }`}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-vscode-inputBg/40 transition-colors select-none"
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-2">
          {getToolIcon()}
          <span className="font-mono font-semibold text-vscode-fg text-[11px]">
            {toolCall.name}
          </span>
          {primaryArg && (
            <span
              className="text-[11px] font-mono text-vscode-sidefg truncate"
              title={String(primaryArg)}
            >
              {String(primaryArg)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusBadge()}
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-vscode-sidefg" />
          ) : (
            <ChevronRight className="w-3 h-3 text-vscode-sidefg" />
          )}
        </div>
      </div>

      {/* Approval Buttons for Human in the Loop */}
      {isAwaiting && (
        <div className="px-3 py-2 bg-amber-950/40 border-t border-amber-800/40 flex items-center justify-between gap-2 select-none">
          <span className="text-[11px] text-amber-200">
            {toolCall.name === 'execute_command'
              ? 'Permission requested to run terminal command.'
              : 'Permission requested to modify file (diff opened in VS Code).'}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.(toolCall.id);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition-colors"
            >
              <Check className="w-3 h-3" /> Approve
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeny?.(toolCall.id);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-red-700/80 hover:bg-red-600 text-white rounded text-[11px] font-medium transition-colors"
            >
              <X className="w-3 h-3" /> Deny
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="p-2.5 border-t border-vscode-border/50 bg-[#141414] text-[11px] font-mono space-y-2 select-text">
          {/* Inputs */}
          <div>
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1 select-none">
              Arguments:
            </div>
            <pre className="p-1.5 rounded bg-black/40 border border-vscode-border/40 text-neutral-300 overflow-x-auto text-[11px]">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>

          {/* Outputs */}
          {toolCall.output && (
            <div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1 select-none">
                Output:
              </div>
              <pre className="p-1.5 rounded bg-black/40 border border-vscode-border/40 text-neutral-300 overflow-x-auto text-[11px] max-h-48">
                {toolCall.output}
              </pre>
            </div>
          )}

          {/* Error */}
          {toolCall.error && (
            <div>
              <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1 select-none">
                Error:
              </div>
              <pre className="p-1.5 rounded bg-red-950/20 border border-red-800/40 text-red-300 overflow-x-auto text-[11px]">
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
