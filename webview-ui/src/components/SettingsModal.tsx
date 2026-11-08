import React, { useState } from 'react';
import { X, Key, Check, Trash2, ExternalLink } from 'lucide-react';
import { ProviderType } from '../../../src/shared/protocol';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: Record<ProviderType, boolean>;
  onSaveKey: (provider: ProviderType, key: string) => void;
  onRemoveKey: (provider: ProviderType) => void;
  onOpenLogs?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onSaveKey,
  onRemoveKey,
  onOpenLogs,
}) => {
  const [anthropicInput, setAnthropicInput] = useState('');
  const [geminiInput, setGeminiInput] = useState('');
  const [openaiInput, setOpenaiInput] = useState('');

  if (!isOpen) return null;

  const providersConfig = [
    {
      id: 'anthropic' as ProviderType,
      name: 'Anthropic Claude',
      url: 'https://console.anthropic.com/settings/keys',
      value: anthropicInput,
      setValue: setAnthropicInput,
      placeholder: 'sk-ant-api...',
    },
    {
      id: 'gemini' as ProviderType,
      name: 'Google Gemini',
      url: 'https://aistudio.google.com/app/apikey',
      value: geminiInput,
      setValue: setGeminiInput,
      placeholder: 'AIzaSy...',
    },
    {
      id: 'openai' as ProviderType,
      name: 'OpenAI',
      url: 'https://platform.openai.com/api-keys',
      value: openaiInput,
      setValue: setOpenaiInput,
      placeholder: 'sk-proj-...',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-vscode-bg border border-vscode-border rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-vscode-border bg-vscode-sidebg">
          <div className="flex items-center gap-2 font-medium">
            <Key className="w-4 h-4 text-vscode-btnBg" />
            <span>LLM API Keys</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-vscode-inputBg rounded text-vscode-sidefg hover:text-vscode-fg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          <p className="text-vscode-sidefg">
            Keys are securely stored in your local operating system keychain using VS Code's Secret Storage API.
          </p>

          {providersConfig.map((p) => {
            const hasKey = apiKeys[p.id];
            return (
              <div key={p.id} className="p-3 bg-vscode-sidebg rounded border border-vscode-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-vscode-fg">{p.name}</span>
                    {hasKey ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-600/40">
                        <Check className="w-3 h-3" /> Configured
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-600/40">
                        Not Set
                      </span>
                    )}
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                  >
                    Get Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={p.value}
                    onChange={(e) => p.setValue(e.target.value)}
                    placeholder={hasKey ? '•••••••••••••••••••• (Enter new to replace)' : p.placeholder}
                    className="flex-1 bg-vscode-inputBg text-vscode-inputFg border border-vscode-inputBorder rounded px-2 py-1 text-xs focus:outline-none"
                  />
                  {p.value.trim().length > 0 && (
                    <button
                      onClick={() => {
                        onSaveKey(p.id, p.value.trim());
                        p.setValue('');
                      }}
                      className="bg-vscode-btnBg text-vscode-btnFg px-2.5 py-1 rounded text-xs hover:bg-vscode-btnHover font-medium"
                    >
                      Save
                    </button>
                  )}
                  {hasKey && (
                    <button
                      onClick={() => onRemoveKey(p.id)}
                      className="p-1 hover:bg-red-950/60 text-red-400 border border-red-800/40 rounded transition-colors"
                      title="Delete saved key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2.5 border-t border-vscode-border bg-vscode-sidebg flex justify-between items-center">
          {onOpenLogs ? (
            <button
              onClick={() => {
                onOpenLogs();
                onClose();
              }}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> View Request Audit Logs
            </button>
          ) : <div />}
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
