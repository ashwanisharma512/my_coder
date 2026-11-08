import React, { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import { ChatMessage, ToolCallEvent } from '../../../src/shared/protocol';
import { Sparkles, Terminal } from 'lucide-react';

interface MessageListProps {
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  activeToolCalls?: ToolCallEvent[];
  onQuickPrompt?: (prompt: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingText,
  isStreaming,
  activeToolCalls,
  onQuickPrompt,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-vscode-sidefg select-none">
        <div className="w-10 h-10 rounded-full bg-vscode-inputBg flex items-center justify-center mb-3 text-vscode-btnBg">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-medium text-vscode-fg mb-1">How can I help you code today?</h3>
        <p className="text-xs max-w-xs mb-4 text-neutral-400">
          Ask questions, explain code, fix bugs, or generate components using Claude, Gemini, or OpenAI.
        </p>

        {onQuickPrompt && (
          <div className="flex flex-col gap-1.5 w-full max-w-xs text-left">
            <button
              onClick={() => onQuickPrompt('Explain this file and how it fits into the project.')}
              className="px-2.5 py-1.5 rounded border border-vscode-border bg-vscode-sidebg hover:bg-vscode-inputBg text-xs text-vscode-fg text-left transition-colors flex items-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5 text-vscode-btnBg flex-shrink-0" />
              <span className="truncate">Explain active file</span>
            </button>
            <button
              onClick={() => onQuickPrompt('Find bugs or potential edge cases in the selected code.')}
              className="px-2.5 py-1.5 rounded border border-vscode-border bg-vscode-sidebg hover:bg-vscode-inputBg text-xs text-vscode-fg text-left transition-colors flex items-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5 text-vscode-btnBg flex-shrink-0" />
              <span className="truncate">Review & find bugs in selection</span>
            </button>
            <button
              onClick={() => onQuickPrompt('Write unit tests for the functions in this file.')}
              className="px-2.5 py-1.5 rounded border border-vscode-border bg-vscode-sidebg hover:bg-vscode-inputBg text-xs text-vscode-fg text-left transition-colors flex items-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5 text-vscode-btnBg flex-shrink-0" />
              <span className="truncate">Generate unit tests</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto select-text">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}

      {isStreaming && (
        <MessageItem
          message={{
            id: 'streaming-active',
            role: 'assistant',
            content: streamingText || (activeToolCalls && activeToolCalls.length > 0 ? '' : 'Thinking...'),
            timestamp: Date.now(),
            toolCalls: activeToolCalls,
          }}
        />
      )}
    </div>
  );
};
