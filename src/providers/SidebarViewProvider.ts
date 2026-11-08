import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SecretManager } from './SecretManager';
import { EditorContext } from '../context/EditorContext';
import { SystemPrompts } from '../context/SystemPrompts';
import { LLMFactory } from '../llm/LLMFactory';
import { LLMMessage } from '../llm/types';
import { RequestLogger } from '../services/logger/RequestLogger';
import { UsageTracker } from '../services/metrics/UsageTracker';
import { ToolRegistry } from '../tools/ToolRegistry';
import { SessionManager } from '../services/session/SessionManager';
import {
  ChatMessage,
  ChatSession,
  ExtensionMessage,
  ProviderType,
  ToolCallEvent,
  WebviewMessage,
} from '../shared/protocol';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'my-coder.chatView';

  private _view?: vscode.WebviewView;
  private currentAbortController?: AbortController;
  private conversationHistory: LLMMessage[] = [];
  private activeSession?: ChatSession;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly secretManager: SecretManager,
    private readonly logger: RequestLogger,
    private readonly usageTracker: UsageTracker,
    private readonly toolRegistry: ToolRegistry,
    private readonly sessionManager: SessionManager
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      await this.handleWebviewMessage(message);
    });

    // Notify webview when active editor or selection changes
    vscode.window.onDidChangeActiveTextEditor(() => {
      this.sendContextUpdate();
    });

    vscode.window.onDidChangeTextEditorSelection(() => {
      this.sendContextUpdate();
    });
  }

  public sendSelectionToChat() {
    if (!this._view) {
      vscode.commands.executeCommand('my-coder.chatView.focus');
    }
    this.sendContextUpdate();
  }

  private sendContextUpdate() {
    if (!this._view) {
      return;
    }
    const context = EditorContext.getActiveContext();
    this.postMessage({
      type: 'contextUpdated',
      activeContext: context,
    });
  }

  private async postMessage(message: ExtensionMessage) {
    if (this._view) {
      await this._view.webview.postMessage(message);
    }
  }

  private async handleWebviewMessage(message: WebviewMessage) {
    switch (message.type) {
      case 'ready': {
        const keys = await this.secretManager.getKeysStatus();
        const activeContext = EditorContext.getActiveContext();
        const models = LLMFactory.getAllModels();
        const usageStats = this.usageTracker.getStats();

        let defaultModel = models[0]?.id || 'gemini-3.8-flash';
        let defaultProvider = models[0]?.provider || 'gemini';

        if (keys.gemini) {
          const geminiModel = models.find((m) => m.provider === 'gemini');
          if (geminiModel) {
            defaultModel = geminiModel.id;
            defaultProvider = 'gemini';
          }
        } else if (keys.anthropic) {
          const anthropicModel = models.find((m) => m.provider === 'anthropic');
          if (anthropicModel) {
            defaultModel = anthropicModel.id;
            defaultProvider = 'anthropic';
          }
        } else if (keys.openai) {
          const openaiModel = models.find((m) => m.provider === 'openai');
          if (openaiModel) {
            defaultModel = openaiModel.id;
            defaultProvider = 'openai';
          }
        }

        // Load or restore persistent session
        this.activeSession = this.sessionManager.getOrCreateActiveSession(
          defaultProvider,
          defaultModel
        );

        this.conversationHistory = this.activeSession.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const sessionsList = this.sessionManager.listSessions();

        await this.postMessage({
          type: 'init',
          apiKeys: keys,
          activeContext,
          models,
          selectedModel: this.activeSession.model || defaultModel,
          selectedProvider: this.activeSession.provider || defaultProvider,
          usageStats,
          activeSession: this.activeSession,
          sessionsList,
        });
        break;
      }

      case 'loadSession': {
        const loaded = this.sessionManager.loadSession(message.sessionId);
        if (loaded) {
          this.activeSession = loaded;
          await this.sessionManager.setActiveSessionId(loaded.id);
          this.conversationHistory = loaded.messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));
          await this.postMessage({
            type: 'sessionLoaded',
            session: loaded,
          });
        }
        break;
      }

      case 'deleteSession': {
        this.sessionManager.deleteSession(message.sessionId);
        if (this.activeSession?.id === message.sessionId) {
          this.activeSession = this.sessionManager.createSession('gemini', 'gemini-3.8-flash');
          this.conversationHistory = [];
          await this.postMessage({
            type: 'sessionLoaded',
            session: this.activeSession,
          });
        }
        const updatedList = this.sessionManager.listSessions();
        await this.postMessage({
          type: 'sessionsListUpdated',
          sessions: updatedList,
        });
        break;
      }

      case 'newSession': {
        if (this.currentAbortController) {
          this.currentAbortController.abort();
          this.currentAbortController = undefined;
        }
        const provider = this.activeSession?.provider || 'gemini';
        const model = this.activeSession?.model || 'gemini-3.8-flash';
        this.activeSession = this.sessionManager.createSession(provider, model);
        this.conversationHistory = [];
        await this.postMessage({
          type: 'sessionLoaded',
          session: this.activeSession,
        });
        const updatedList = this.sessionManager.listSessions();
        await this.postMessage({
          type: 'sessionsListUpdated',
          sessions: updatedList,
        });
        break;
      }

      case 'listSessions': {
        const list = this.sessionManager.listSessions();
        await this.postMessage({
          type: 'sessionsListUpdated',
          sessions: list,
        });
        break;
      }

      case 'getApiKeysStatus': {
        const keys = await this.secretManager.getKeysStatus();
        await this.postMessage({
          type: 'keysStatusUpdated',
          apiKeys: keys,
        });
        break;
      }

      case 'saveApiKey': {
        await this.secretManager.setApiKey(message.provider, message.apiKey);
        const keys = await this.secretManager.getKeysStatus();
        await this.postMessage({
          type: 'keysStatusUpdated',
          apiKeys: keys,
        });
        vscode.window.showInformationMessage(
          `My Coder: ${message.provider.toUpperCase()} API key saved securely.`
        );
        break;
      }

      case 'removeApiKey': {
        await this.secretManager.deleteApiKey(message.provider);
        const keys = await this.secretManager.getKeysStatus();
        await this.postMessage({
          type: 'keysStatusUpdated',
          apiKeys: keys,
        });
        vscode.window.showInformationMessage(
          `My Coder: ${message.provider.toUpperCase()} API key removed.`
        );
        break;
      }

      case 'refreshContext': {
        this.sendContextUpdate();
        break;
      }

      case 'clearHistory': {
        this.conversationHistory = [];
        if (this.activeSession) {
          this.activeSession.messages = [];
          this.sessionManager.saveSession(this.activeSession);
        }
        break;
      }

      case 'abortStream': {
        if (this.currentAbortController) {
          this.currentAbortController.abort();
          this.currentAbortController = undefined;
        }
        break;
      }

      case 'openLogFile': {
        await this.logger.openCurrentLogFile();
        break;
      }

      case 'getUsageStats': {
        const stats = this.usageTracker.getStats();
        await this.postMessage({
          type: 'usageStatsUpdated',
          usageStats: stats,
        });
        break;
      }

      case 'resetUsageStats': {
        const stats = await this.usageTracker.resetStats();
        await this.postMessage({
          type: 'usageStatsUpdated',
          usageStats: stats,
        });
        vscode.window.showInformationMessage('My Coder: API usage counters reset.');
        break;
      }

      case 'insertCode': {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showWarningMessage('No active editor tab to insert code into.');
          return;
        }
        await editor.edit((editBuilder) => {
          editBuilder.insert(editor.selection.active, message.code);
        });
        vscode.window.showInformationMessage('Code inserted into editor.');
        break;
      }

      case 'createNewFile': {
        const doc = await vscode.workspace.openTextDocument({
          content: message.code,
          language: message.language || 'typescript',
        });
        await vscode.window.showTextDocument(doc, { preview: false });
        break;
      }

      case 'sendMessage': {
        await this.handleSendMessage(message);
        break;
      }
    }
  }

  private parseToolCalls(text: string): Array<{ name: string; args: any; raw: string }> {
    const calls: Array<{ name: string; args: any; raw: string }> = [];
    const regex = /<tool_call\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/tool_call>/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const raw = match[0];
      const name = match[1];
      let args = {};
      try {
        args = JSON.parse(match[2].trim());
      } catch {
        // Fallback for sloppy JSON
        try {
          const cleaned = match[2].trim().replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ');
          args = JSON.parse(cleaned);
        } catch {
          args = { input: match[2].trim() };
        }
      }
      calls.push({ name, args, raw });
    }

    return calls;
  }

  private async handleSendMessage(message: {
    text: string;
    provider: ProviderType;
    model: string;
    context?: any;
  }) {
    const apiKey = await this.secretManager.getApiKey(message.provider);
    if (!apiKey) {
      await this.postMessage({
        type: 'streamError',
        error: `No API key found for ${message.provider.toUpperCase()}. Please configure it in the settings icon above.`,
      });
      return;
    }

    const traceId = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    // Increment and broadcast call counter
    const updatedStats = await this.usageTracker.recordApiCall(message.provider);
    await this.postMessage({
      type: 'usageStatsUpdated',
      usageStats: updatedStats,
    });

    this.currentAbortController = new AbortController();

    const provider = LLMFactory.getProvider(message.provider);

    // Build system prompt with editor context & available tools
    const systemPrompt = SystemPrompts.getSystemPrompt(message.context);

    // Ensure active session
    if (!this.activeSession) {
      this.activeSession = this.sessionManager.createSession(message.provider, message.model);
    }
    this.activeSession.provider = message.provider;
    this.activeSession.model = message.model;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.text,
      timestamp: Date.now(),
    };
    this.activeSession.messages.push(userMessage);
    this.sessionManager.saveSession(this.activeSession);

    this.conversationHistory.push({
      role: 'user',
      content: message.text,
    });

    const fullMessages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory,
    ];

    const accumulatedToolCalls: ToolCallEvent[] = [];
    let currentTurn = 0;
    const maxTurns = 6;
    let continueLoop = true;
    let finalAssistantText = '';

    try {
      while (continueLoop && currentTurn < maxTurns) {
        currentTurn++;
        const turnStartTime = Date.now();

        // Log outgoing turn
        this.logger.logOutgoingRequest(traceId, message.provider, message.model, {
          messages: fullMessages,
        });

        let turnAccumulated = '';

        await provider.streamChat(
          fullMessages,
          message.model,
          apiKey,
          {
            onToken: (token) => {
              turnAccumulated += token;
              this.postMessage({ type: 'streamToken', token });
            },
            onError: (error) => {
              throw error;
            },
            onFinish: (fullText) => {
              turnAccumulated = fullText;
            },
          },
          {
            abortSignal: this.currentAbortController.signal,
          }
        );

        const durationMs = Date.now() - turnStartTime;
        this.logger.logIncomingResponse(
          traceId,
          message.provider,
          message.model,
          durationMs,
          turnAccumulated
        );

        finalAssistantText += (finalAssistantText ? '\n\n' : '') + turnAccumulated;

        // Check if the model invoked any tools
        const parsedTools = this.parseToolCalls(turnAccumulated);

        if (parsedTools.length === 0) {
          // Model finished its reasoning with no further tools requested
          continueLoop = false;
        } else {
          // Autonomous Agent Tool Execution Loop
          for (const call of parsedTools) {
            if (this.currentAbortController.signal.aborted) {
              continueLoop = false;
              break;
            }

            const callId = 'call_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            const toolEvent: ToolCallEvent = {
              id: callId,
              name: call.name,
              args: call.args,
              status: 'running',
            };

            accumulatedToolCalls.push(toolEvent);
            await this.postMessage({
              type: 'toolCallStart',
              toolCall: toolEvent,
            });

            // Execute the tool in the workspace
            const toolResult = await this.toolRegistry.executeTool(
              traceId,
              call.name,
              call.args
            );

            toolEvent.status = toolResult.success ? 'completed' : 'error';
            toolEvent.output = toolResult.output;
            toolEvent.error = toolResult.error;

            await this.postMessage({
              type: 'toolCallEnd',
              toolCall: toolEvent,
            });

            // Feed tool result back into LLM conversation
            fullMessages.push({
              role: 'assistant',
              content: `I invoked tool ${call.name} with parameters: ${JSON.stringify(call.args)}`,
            });

            const resultText = toolResult.success
              ? `[Tool Result for ${call.name}]:\n${toolResult.output}`
              : `[Tool Error for ${call.name}]:\n${toolResult.error}`;

            fullMessages.push({
              role: 'user',
              content: resultText,
            });
          }
        }
      }

      // Turn loop complete: clean up tool tags from final displayed text if desired
      const cleanedResponse = finalAssistantText
        .replace(/<tool_call\s+name=["'][^"']+["']\s*>[\s\S]*?<\/tool_call>/gi, '')
        .trim();

      const assistantMsgContent = cleanedResponse || finalAssistantText;

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMsgContent,
      });

      if (this.activeSession) {
        this.activeSession.messages.push({
          id: Date.now().toString(),
          role: 'assistant',
          content: assistantMsgContent,
          timestamp: Date.now(),
          toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
        });
        this.sessionManager.saveSession(this.activeSession);
        await this.postMessage({
          type: 'sessionsListUpdated',
          sessions: this.sessionManager.listSessions(),
        });
      }

      await this.postMessage({
        type: 'streamEnd',
        fullText: assistantMsgContent,
        toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
      });

      this.currentAbortController = undefined;
    } catch (err: any) {
      this.currentAbortController = undefined;
      const errMsg = err.message || 'Unknown error occurred during generation.';
      this.logger.logIncomingResponse(
        traceId,
        message.provider,
        message.model,
        0,
        '',
        errMsg
      );
      await this.postMessage({
        type: 'streamError',
        error: errMsg,
      });
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const distPath = path.join(this.extensionUri.fsPath, 'dist', 'webview');
    const indexPath = path.join(distPath, 'index.html');

    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');

      html = html.replace(/(href|src)="(\/|\.\/)?assets\/(.*?)"/g, (_match, attr, _p1, assetName) => {
        const assetUri = webview.asWebviewUri(
          vscode.Uri.file(path.join(distPath, 'assets', assetName))
        );
        return `${attr}="${assetUri.toString()}"`;
      });

      return html;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Coder</title>
</head>
<body>
  <h3>My Coder is initializing...</h3>
</body>
</html>`;
  }
}
