import React, { useState } from 'react';
import { X, Key, Check, Trash2, ExternalLink, ShieldCheck, Cpu } from 'lucide-react';
import { AppSettings, ProviderType } from '../../../src/shared/protocol';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: Record<ProviderType, boolean>;
  settings: AppSettings;
  onSaveKey: (provider: ProviderType, key: string) => void;
  onRemoveKey: (provider: ProviderType) => void;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onOpenLogs?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  settings,
  onSaveKey,
  onRemoveKey,
  onUpdateSettings,
  onOpenLogs,
}) => {
  const [anthropicInput, setAnthropicInput] = useState('');
  const [geminiInput, setGeminiInput] = useState('');
  const [openaiInput, setOpenaiInput] = useState('');
  const [groqInput, setGroqInput] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollamaBaseUrl || 'http://localhost:11434');

  if (!isOpen) return null;

  const providersConfig = [
    {
      id: 'gemini' as ProviderType,
      name: 'Google Gemini',
      url: 'https://aistudio.google.com/app/apikey',
      value: geminiInput,
      setValue: setGeminiInput,
      placeholder: 'AIzaSy...',
      badge: 'Free Tier Available',
    },
    {
      id: 'groq' as ProviderType,
      name: 'Groq Cloud (Llama 3.3 70B)',
      url: 'https://console.groq.com/keys',
      value: groqInput,
      setValue: setGroqInput,
      placeholder: 'gsk_...',
      badge: '100% Free & Fast',
    },
    {
      id: 'anthropic' as ProviderType,
      name: 'Anthropic Claude',
      url: 'https://console.anthropic.com/settings/keys',
      value: anthropicInput,
      setValue: setAnthropicInput,
      placeholder: 'sk-ant-api...',
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="bg-vscode-bg border border-vscode-border rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-vscode-border bg-vscode-sidebg">
          <div className="flex items-center gap-2 font-medium">
            <Key className="w-4 h-4 text-vscode-btnBg" />
            <span className="font-semibold text-vscode-fg">Settings & LLM Providers</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-vscode-inputBg rounded text-vscode-sidefg hover:text-vscode-fg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs select-text">
          {/* Safety & Approvals */}
          <div className="p-3 bg-vscode-sidebg rounded border border-vscode-border space-y-2 select-none">
            <div className="flex items-center gap-1.5 font-semibold text-vscode-fg">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Safety & Human-in-the-Loop Approvals</span>
            </div>
            <p className="text-[11px] text-vscode-sidefg">
              When disabled, My Coder pauses and shows an approval card before modifying files or running commands.
            </p>
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-vscode-fg">
                <input
                  type="checkbox"
                  checked={settings.autoApproveEdits}
                  onChange={(e) =>
                    onUpdateSettings({ autoApproveEdits: e.target.checked })
                  }
                  className="rounded accent-vscode-btnBg"
                />
                <span>Auto-approve file edits without asking</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-vscode-fg">
                <input
                  type="checkbox"
                  checked={settings.autoApproveCommands}
                  onChange={(e) =>
                    onUpdateSettings({ autoApproveCommands: e.target.checked })
                  }
                  className="rounded accent-vscode-btnBg"
                />
                <span>Auto-approve terminal commands without asking</span>
              </label>
            </div>
          </div>

          {/* Local Ollama */}
          <div className="p-3 bg-vscode-sidebg rounded border border-vscode-border space-y-2 select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-vscode-fg">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>Ollama (Local Offline Models)</span>
              </div>
              <span className="text-[10px] text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-600/40">
                100% Free & Private
              </span>
            </div>
            <p className="text-[11px] text-vscode-sidefg">
              Run models locally (e.g. Qwen 2.5 Coder, DeepSeek) with zero cost or keys.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="flex-1 bg-vscode-inputBg text-vscode-inputFg border border-vscode-inputBorder rounded px-2 py-1 text-xs focus:outline-none font-mono"
              />
              <button
                onClick={() => onUpdateSettings({ ollamaBaseUrl: ollamaUrl })}
                className="bg-vscode-btnBg text-vscode-btnFg px-2.5 py-1 rounded text-xs hover:bg-vscode-btnHover font-medium"
              >
                Update
              </button>
            </div>
          </div>

          {/* Cloud API Keys */}
          <div className="space-y-3">
            <span className="font-semibold text-vscode-fg block select-none">
              Cloud API Keys (Encrypted in OS Keychain)
            </span>

            {providersConfig.map((p) => {
              const hasKey = apiKeys[p.id];
              return (
                <div
                  key={p.id}
                  className="p-3 bg-vscode-sidebg rounded border border-vscode-border space-y-2"
                >
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
                      {p.badge && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1 rounded border border-emerald-800/40">
                          {p.badge}
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
        </div>

        <div className="px-4 py-2.5 border-t border-vscode-border bg-vscode-sidebg flex justify-between items-center select-none">
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
