import React, { useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

interface InputAreaProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onAbort: () => void;
  isStreaming: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  input,
  setInput,
  onSend,
  onAbort,
  isStreaming,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="p-2.5 border-t border-vscode-border bg-vscode-sidebg">
      <div className="flex items-end gap-1.5 bg-vscode-inputBg border border-vscode-inputBorder focus-within:border-vscode-btnBg rounded p-1.5 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or describe code to write... (Enter to send, Shift+Enter for newline)"
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
    </div>
  );
};
