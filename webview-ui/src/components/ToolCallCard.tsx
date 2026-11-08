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
} from 'lucide-react';
import { ToolCallEvent } from '../../../src/shared/protocol';

interface ToolCallCardProps {
  toolCall: ToolCallEvent;
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);

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

  return (
    <div className="my-1.5 rounded border border-vscode-border bg-vscode-sidebg/60 text-xs overflow-hidden select-text">
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
