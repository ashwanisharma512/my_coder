import React, { useState } from 'react';
import { Copy, Check, FilePlus, ArrowDownToLine } from 'lucide-react';
import { getVsCodeApi } from '../vscode';

interface CodeBlockProps {
  language?: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const vscode = getVsCodeApi();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    vscode.postMessage({
      type: 'insertCode',
      code,
    });
  };

  const handleNewFile = () => {
    vscode.postMessage({
      type: 'createNewFile',
      code,
      language: language || 'typescript',
    });
  };

  return (
    <div className="my-2 rounded border border-vscode-border bg-[#181818] overflow-hidden text-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#222222] border-b border-vscode-border text-neutral-400 select-none">
        <span className="font-mono text-[11px] font-semibold text-neutral-300">
          {language || 'text'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleInsert}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-700/60 hover:text-white transition-colors text-[11px]"
            title="Insert at active editor cursor"
          >
            <ArrowDownToLine className="w-3 h-3" />
            <span>Insert</span>
          </button>
          <button
            onClick={handleNewFile}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-700/60 hover:text-white transition-colors text-[11px]"
            title="Open in new editor file"
          >
            <FilePlus className="w-3 h-3" />
            <span>New File</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-700/60 hover:text-white transition-colors text-[11px]"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="p-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-neutral-200">
        <code>{code}</code>
      </pre>
    </div>
  );
};
