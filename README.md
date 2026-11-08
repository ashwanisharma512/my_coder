# My Coder 🚀

**My Coder** is a production-grade, multi-model AI coding assistant and autonomous agent built directly into VS Code. It provides a chat-centric developer experience with real-time token streaming, active editor context awareness, tool-calling agent loops, visual diffs, human-in-the-loop safety approvals, local audit logging, and persistent session management.

---

## 🌟 Key Features

1. **Provider-Agnostic LLM Engine**:
   - **Google Gemini**: Gemini 3.8 Flash *(Default & Recommended)*, Gemini 3.8 Pro, Gemini 3.8 Flash Lite, Gemini 2.5 Flash, Gemini 2.5 Pro.
   - **Groq Cloud (100% Free & Blazing Fast)**: Llama 3.3 70B Versatile, Llama 3.1 8B Instant, Qwen 2.5 32B.
   - **Ollama (100% Free, Offline & Private)**: Qwen 2.5 Coder 7B/14B, DeepSeek Coder V2, Llama 3.2 via `http://localhost:11434`.
   - **Anthropic Claude**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku.
   - **OpenAI**: GPT-4o, GPT-4o Mini, o3-mini.

2. **Autonomous Tool Execution & Live Cards**:
   - The model can autonomously inspect files (`read_file`), write files (`write_file`), perform surgical search-and-replace (`edit_file`), list workspace files (`list_files`), and run terminal commands (`execute_command`).
   - Live interactive cards show real-time progress: **Running...** (spinner) → **Done** / **Error** with collapsible arguments and output inspect panels.

3. **Visual Diff Review (`vscode.diff`)**:
   - When modifying an existing file, My Coder automatically opens a side-by-side visual diff in VS Code (Original vs Proposed Changes) before saving.

4. **Human-in-the-Loop Safety Approvals**:
   - For sensitive operations (terminal commands and file modifications), the tool card prompts: `[Approve & Run]` or `[Deny]`.
   - Toggle **"Auto-approve file edits"** or **"Auto-approve terminal commands"** in the ⚙️ Settings dialog for hands-free autonomous workflows.

5. **`@file` Workspace Mentions**:
   - Type `@` in the chat input to trigger a searchable workspace file picker with keyboard navigation (`Arrow keys` + `Enter`/`Tab`) to tag any file into your prompt.

6. **Context Compaction & Token Pruner**:
   - When conversations grow beyond 18+ turns, My Coder automatically summarizes earlier messages so you never hit context window limits or slow down response speeds.

7. **Persistent Session Storage & History Drawer**:
   - Every conversation is saved to `.my_coder/sessions/session_<id>.json`.
   - Click the **🕒 History** icon to view past sessions, switch chats, delete conversations, or start a new chat.
   - Conversations **automatically restore** across VS Code reloads (`Ctrl+R`) and restarts.

8. **Local Request & Tool Audit Logger**:
   - Logs all outgoing payloads, incoming responses, and tool executions to `.my_coder/logs/requests_YYYY-MM-DD.jsonl`.
   - Live stream mirror in the VS Code Output Channel (**"My Coder Debug"**).
   - Sensitive API keys are automatically redacted (`[REDACTED]`).

9. **Hourly & Daily Usage Monitor**:
   - Real-time rate monitor badge in header: `📊 Xd / Yh`.
   - Popover modal showing breakdown per provider and a counter reset option.

---

## 📂 Project Architecture

```
my_coder/
├── src/
│   ├── extension.ts                    # Entrypoint & commands
│   ├── providers/
│   │   ├── SidebarViewProvider.ts      # Agent loop, IPC, and approval coordinator
│   │   └── SecretManager.ts            # Encrypted API key storage (vscode.SecretStorage)
│   ├── services/
│   │   ├── logger/
│   │   │   └── RequestLogger.ts        # Local JSONL & Output Channel logger
│   │   ├── metrics/
│   │   │   └── UsageTracker.ts         # Persistent hourly & daily call counter
│   │   └── session/
│   │       └── SessionManager.ts       # File-based persistent chat session manager
│   ├── tools/
│   │   ├── types.ts                    # Tool definitions & execution contracts
│   │   └── ToolRegistry.ts             # Workspace tools runner & visual diff generator
│   ├── context/
│   │   ├── EditorContext.ts            # Active document & selection tracking
│   │   └── SystemPrompts.ts            # Coding-optimized prompt builder with tool schemas
│   ├── llm/
│   │   ├── GeminiProvider.ts           # Google Gemini SDK
│   │   ├── GroqProvider.ts             # Groq Cloud API (Llama 3.3 70B)
│   │   ├── OllamaProvider.ts           # Local Ollama client (localhost:11434)
│   │   ├── AnthropicProvider.ts        # Claude SDK
│   │   ├── OpenAIProvider.ts           # OpenAI SDK
│   │   └── LLMFactory.ts               # Multi-provider registry
│   └── shared/
│       └── protocol.ts                 # Type-safe IPC messages
│
└── webview-ui/                         # Sidebar Webview (React + Vite + Tailwind)
    └── src/
        ├── components/
        │   ├── Header.tsx              # Model switcher, usage badge, logs & history buttons
        │   ├── ToolCallCard.tsx        # Interactive tool card with [Approve] / [Deny]
        │   ├── HistoryDrawer.tsx       # Past sessions drawer with search & delete
        │   ├── UsageModal.tsx          # Hourly & daily calls dashboard
        │   ├── SettingsModal.tsx       # API keys, safety approvals, and Ollama config
        │   ├── ContextBanner.tsx       # Active file & selection pill
        │   ├── MessageList.tsx         # Conversation view with live tool execution cards
        │   ├── MessageItem.tsx         # Markdown renderer + full copy button
        │   ├── CodeBlock.tsx           # Insert at Cursor / New File / Copy buttons
        │   └── InputArea.tsx           # Auto-resizing textarea with @file autocomplete
        └── App.tsx                     # State coordination & event handlers
```

---

## 🛠️ How to Run & Test in VS Code

1. Open the [my_coder](file:///c:/Users/ashwa\Documents\personal\my_coder) folder in VS Code.
2. Press **`F5`** (or press **`Ctrl+R`** in an active Extension Development Host).
3. Try out the new features:
   - **Groq & Ollama**: Select **Llama 3.3 70B (Groq Free)** or **Qwen 2.5 Coder (Ollama Local)** in the model dropdown.
   - **`@file` Mention**: Type `@` in the chat input to pick any file from your workspace.
   - **Safety Approvals & Visual Diff**: Ask the AI to edit a file or run a command — watch it open the visual diff and prompt you for approval!
   - **Persistent History**: Click 🕒 to view all past conversations.
