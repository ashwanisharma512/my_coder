import React from 'react';
import { FileCode, Scissors, RefreshCw } from 'lucide-react';
import { ActiveContext } from '../../../src/shared/protocol';

interface ContextBannerProps {
  context: ActiveContext;
  includeContext: boolean;
  onToggleInclude: () => void;
  onRefresh: () => void;
}

export const ContextBanner: React.FC<ContextBannerProps> = ({
  context,
  includeContext,
  onToggleInclude,
  onRefresh,
}) => {
  if (!context.filePath) {
    return null;
  }

  return (
    <div className="px-3 py-1.5 bg-vscode-sidebg/80 border-b border-vscode-border flex items-center justify-between text-[11px] gap-2 select-none">
      <div className="flex items-center gap-1.5 overflow-hidden text-vscode-sidefg">
        <label className="flex items-center gap-1.5 cursor-pointer truncate">
          <input
            type="checkbox"
            checked={includeContext}
            onChange={onToggleInclude}
            className="rounded accent-vscode-btnBg"
          />
          <FileCode className="w-3.5 h-3.5 flex-shrink-0 text-vscode-btnBg" />
          <span className="truncate text-vscode-fg font-mono" title={context.filePath}>
            {context.fileName}
          </span>
          {context.hasSelection && (
            <span className="flex items-center gap-0.5 text-amber-400 bg-amber-950/40 px-1 rounded flex-shrink-0 border border-amber-800/40">
              <Scissors className="w-3 h-3" /> Selected code
            </span>
          )}
        </label>
      </div>

      <button
        onClick={onRefresh}
        className="p-1 hover:bg-vscode-inputBg rounded text-vscode-sidefg hover:text-vscode-fg transition-colors flex-shrink-0"
        title="Refresh context from active tab"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
};
