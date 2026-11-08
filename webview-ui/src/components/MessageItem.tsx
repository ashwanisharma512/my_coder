import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Sparkles, Copy, Check } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { ChatMessage } from '../../../src/shared/protocol';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`px-3 py-3 border-b border-vscode-border/50 group select-text ${
        isUser ? 'bg-vscode-sidebg/40' : 'bg-transparent'
      }`}
    >
      <div className="flex items-start gap-2.5 max-w-full select-text">
        <div
          className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 select-none ${
            isUser ? 'bg-vscode-inputBg text-vscode-sidefg' : 'bg-vscode-btnBg text-vscode-btnFg'
          }`}
        >
          {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
        </div>

        <div className="flex-1 min-w-0 overflow-hidden leading-relaxed break-words text-[13px] select-text">
          <div className="flex items-center justify-between mb-1 select-none">
            <span className="font-semibold text-[11px] text-vscode-sidefg">
              {isUser ? 'You' : 'My Coder'}
            </span>
            <button
              onClick={handleCopyMessage}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-vscode-inputBg text-vscode-sidefg hover:text-vscode-fg rounded transition-opacity flex items-center gap-1 text-[10px]"
              title="Copy entire response"
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

          <div className="select-text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && (match || codeString.includes('\n'))) {
                    return (
                      <CodeBlock
                        language={match ? match[1] : undefined}
                        code={codeString}
                      />
                    );
                  }

                  return (
                    <code
                      className="bg-vscode-inputBg text-vscode-inputFg px-1 py-0.5 rounded font-mono text-[11px] border border-vscode-border select-text"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p({ children }: any) {
                  return <p className="mb-2 last:mb-0 leading-normal select-text">{children}</p>;
                },
                ul({ children }: any) {
                  return <ul className="list-disc pl-4 mb-2 space-y-1 select-text">{children}</ul>;
                },
                ol({ children }: any) {
                  return <ol className="list-decimal pl-4 mb-2 space-y-1 select-text">{children}</ol>;
                },
                li({ children }: any) {
                  return <li className="leading-normal select-text">{children}</li>;
                },
                a({ href, children }: any) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline select-text"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
