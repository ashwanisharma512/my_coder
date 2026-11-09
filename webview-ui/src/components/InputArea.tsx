import React, { useRef, useEffect, useState } from 'react';
import { Send, Square, FileCode } from 'lucide-react';

interface InputAreaProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onAbort: () => void;
  isStreaming: boolean;
  activeToolName?: string;
  workspaceFiles: string[];
  onSearchFiles: (query: string) => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
  input,
  setInput,
  onSend,
  onAbort,
  isStreaming,
  activeToolName,
  workspaceFiles,
  onSearchFiles,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        160
      )}px`;
    }
  }, [input]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-./]*)$/);

    if (atMatch) {
      setShowFilePicker(true);
      onSearchFiles(atMatch[1]);
      setSelectedIndex(0);
    } else {
      setShowFilePicker(false);
    }
  };

  const insertFileMention = (filePath: string) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart || 0;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);

    const updatedBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_\-./]*)$/, `@${filePath} `);
    setInput(updatedBefore + textAfterCursor);
    setShowFilePicker(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = updatedBefore.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showFilePicker && workspaceFiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % workspaceFiles.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + workspaceFiles.length) % workspaceFiles.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertFileMention(workspaceFiles[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowFilePicker(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="p-2.5 border-t border-vscode-border bg-vscode-sidebg relative">
      {/* Dynamic Agent Status Indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 mb-1.5 px-1 py-0.5 text-[11px] font-medium rounded select-none animate-fadeIn">
          {activeToolName ? (
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Running tool: <code className="px-1 py-0.2 rounded bg-vscode-inputBg font-mono text-[10px] text-amber-300">{activeToolName}</code>...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span>My Coder is thinking and writing...</span>
            </div>
          )}
        </div>
      )}

      {/* File mention autocomplete popup */}
      {showFilePicker && workspaceFiles.length > 0 && (
        <div className="absolute bottom-full left-2 right-2 mb-1 bg-vscode-bg border border-vscode-border rounded shadow-xl overflow-hidden max-h-48 overflow-y-auto z-40 text-xs">
          <div className="px-2.5 py-1 text-[10px] text-neutral-400 bg-vscode-sidebg border-b border-vscode-border uppercase tracking-wider select-none">
            Tag Workspace File (Arrow keys or Tab to select)
          </div>
          {workspaceFiles.map((file, idx) => (
            <div
              key={file}
              onClick={() => insertFileMention(file)}
              className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer font-mono text-[11px] ${
                idx === selectedIndex
                  ? 'bg-vscode-btnBg text-vscode-btnFg'
                  : 'hover:bg-vscode-sidebg text-vscode-fg'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{file}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 bg-vscode-inputBg border border-vscode-inputBorder focus-within:border-vscode-btnBg rounded p-1.5 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question, describe code, or type @ to mention files... (Enter to send)"
          rows={1}
          className="flex-1 bg-transparent text-vscode-inputFg text-xs resize-none focus:outline-none max-h-40 py-1 px-1.5 leading-normal"
        />

        {isStreaming ? (
          <button
            onClick={onAbort}
            className="p-1.5 rounded bg-red-600 hover:bg-red-700 text-white transition-colors flex-shrink-0"
            title="Stop generation"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!input.trim()}
            className="p-1.5 rounded bg-vscode-btnBg hover:bg-vscode-btnHover disabled:opacity-40 disabled:hover:bg-vscode-btnBg text-vscode-btnFg transition-colors flex-shrink-0"
            title="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom helper line */}
      <div className="flex items-center justify-between px-1 pt-1 text-[10px] text-neutral-500 select-none">
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-sky-400 animate-pulse' : 'bg-emerald-500'}`}></span>
          {isStreaming ? 'Busy' : 'Idle (ready)'}
        </span>
        <span>Shift+Enter for newline</span>
      </div>
    </div>
  );
};
