# My Coder 🚀

**My Coder** is a multi-model AI coding assistant built directly into VS Code. It provides a chat-centric developer experience with real-time token streaming, active editor context awareness, one-click code actions, a local audit logger, and an API rate & usage monitor.

---

## 🌟 Key Features

1. **Provider-Agnostic LLM Engine**:
   - **Google Gemini**: Gemini 3.8 Flash *(Default)*, Gemini 3.8 Pro, Gemini 3.8 Flash Lite, Gemini 2.5 Flash, Gemini 2.5 Pro.
   - **Anthropic Claude**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku.
   - **OpenAI**: GPT-4o, GPT-4o Mini, o3-mini.
2. **Local Request & Tool Audit Logger**:
   - Every outgoing request, incoming model stream, and tool execution is recorded in `.my_coder/logs/requests_YYYY-MM-DD.jsonl`.
   - Sensitive API keys are automatically redacted (`[REDACTED]`).
   - Live streaming to the VS Code Output Channel (**"My Coder Debug"**).
   - One-click **"Open Log File"** button in the header and settings dialog.
3. **Hourly & Daily API Usage Monitor**:
   - Tracks total API calls per hour and per day.
   - Tracks breakdown per provider (Gemini, Claude, OpenAI).
   - Real-time badge in the header: `📊 Xd / Yh`.
   - Interactive popover modal with detailed metrics and counter reset.
4. **Agent Tools System**:
   - `read_file`: Reads workspace files with line range support.
   - `write_file`: Creates/updates workspace files.
   - `edit_file`: Performs search-and-replace edits.
   - `list_files`: Explores project directories and lists files.
   - `execute_command`: Runs shell commands (PowerShell/Bash) in the workspace.
5. **Interactive Code Block Actions**:
   - **Insert at Cursor**: Injects code directly into your active editor at your current cursor position.
   - **New File**: Opens a new editor tab with the generated code.
   - **Copy**: Quick clipboard copy with confirmation checkmark.
6. **Secure Key Management**:
   - Keys are encrypted and stored in your operating system's native keychain using `vscode.SecretStorage`.

---

## 📂 Project Architecture

```
my_coder/
├── src/
│   ├── extension.ts                    # Entrypoint & commands
│   ├── providers/
│   │   ├── SidebarViewProvider.ts      # Webview host & message dispatcher
│   │   └── SecretManager.ts            # Encrypted API key storage
│   ├── services/
│   │   ├── logger/
│   │   │   └── RequestLogger.ts        # Local JSONL & Output Channel logger
│   │   └── metrics/
│   │       └── UsageTracker.ts         # Persistent hourly & daily call counter
│   ├── tools/
│   │   ├── types.ts                    # Tool definitions & execution contracts
│   │   └── ToolRegistry.ts             # Workspace tools runner & logger bridge
│   ├── context/
│   │   ├── EditorContext.ts            # Tracks active document & selection
│   │   └── SystemPrompts.ts            # Coding-optimized prompt builder
│   ├── llm/
│   │   ├── AnthropicProvider.ts
│   │   ├── GeminiProvider.ts
│   │   ├── OpenAIProvider.ts
│   │   └── LLMFactory.ts
│   └── shared/
│       └── protocol.ts                 # Type-safe IPC messages
│
└── webview-ui/                         # Sidebar Webview (React + Vite + Tailwind)
    └── src/
        ├── components/
        │   ├── Header.tsx              # Model switcher, usage badge, logs button
        │   ├── UsageModal.tsx          # Hourly & daily calls dashboard
        │   ├── SettingsModal.tsx       # API keys vault
        │   ├── ContextBanner.tsx       # Active file & selection pill
        │   ├── MessageList.tsx         # Conversation scroll view
        │   ├── MessageItem.tsx         # Markdown renderer + full copy button
        │   ├── CodeBlock.tsx           # Insert / New File / Copy buttons
        │   └── InputArea.tsx           # Textarea with Send / Abort
        └── App.tsx                     # State coordination & event handlers
```

---

## 🛠️ How to Run & Test in VS Code

1. Open the [my_coder](file:///c:/Users/ashwa/Documents/personal/my_coder) folder in VS Code.
2. Press **`F5`** (or press **`Ctrl+R`** in an already open Extension Development Host).
3. In the sidebar:
   - Notice the live usage badge in the header (e.g. `📊 0d / 0h`). Click it to view the **Usage & Rate Monitor**.
   - Click the 📄 (Log) icon to view your local audit log file (`.my_coder/logs/requests_*.jsonl`).
