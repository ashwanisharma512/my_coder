import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface LogEntry {
  timestamp: string;
  traceId: string;
  type: 'request' | 'response' | 'tool_call' | 'error';
  provider?: string;
  model?: string;
  durationMs?: number;
  data: any;
  error?: string;
}

export class RequestLogger {
  private outputChannel: vscode.OutputChannel;
  private logDir: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel('My Coder Debug');

    // Prefer workspace root .my_coder/logs/, fallback to extension storage
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      this.logDir = path.join(workspaceFolder.uri.fsPath, '.my_coder', 'logs');
    } else {
      this.logDir = path.join(this.context.globalStorageUri.fsPath, 'logs');
    }

    this.ensureLogDir();
  }

  private ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      // Add .my_coder to workspace .gitignore if it exists and isn't already ignored
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const gitignorePath = path.join(workspaceFolder.uri.fsPath, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
          const content = fs.readFileSync(gitignorePath, 'utf-8');
          if (!content.includes('.my_coder')) {
            fs.appendFileSync(gitignorePath, '\n# My Coder logs and data\n.my_coder/\n');
          }
        }
      }
    } catch (err) {
      console.error('Failed to initialize log directory:', err);
    }
  }

  private getLogFilePath(): string {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return path.join(this.logDir, `requests_${today}.jsonl`);
  }

  private sanitize(obj: any): any {
    try {
      const str = JSON.stringify(obj, (key, value) => {
        if (typeof value === 'string') {
          // Redact standard API keys and authorization headers
          if (/api[-_]?key/i.test(key) || /secret/i.test(key) || /token/i.test(key)) {
            return '[REDACTED]';
          }
          if (value.startsWith('AIzaSy') || value.startsWith('sk-ant-') || value.startsWith('sk-proj-') || value.startsWith('sk-')) {
            return '[REDACTED]';
          }
        }
        return value;
      });
      return JSON.parse(str);
    } catch {
      return obj;
    }
  }

  private writeEntry(entry: LogEntry) {
    try {
      this.ensureLogDir();
      const filePath = this.getLogFilePath();
      const sanitized = this.sanitize(entry);
      const line = JSON.stringify(sanitized) + '\n';
      fs.appendFileSync(filePath, line, 'utf-8');

      // Also mirror to VS Code output channel
      const prefix = `[${entry.timestamp}] [${entry.type.toUpperCase()}]`;
      if (entry.type === 'request') {
        this.outputChannel.appendLine(`${prefix} -> ${entry.provider}/${entry.model} (Trace: ${entry.traceId})`);
      } else if (entry.type === 'response') {
        this.outputChannel.appendLine(`${prefix} <- ${entry.provider}/${entry.model} (${entry.durationMs}ms)`);
      } else if (entry.type === 'tool_call') {
        this.outputChannel.appendLine(`${prefix} Tool: ${entry.data?.toolName} (${entry.durationMs}ms) Success: ${!entry.error}`);
      } else if (entry.type === 'error') {
        this.outputChannel.appendLine(`${prefix} ERROR: ${entry.error}`);
      }
    } catch (err) {
      console.error('Failed to write log entry:', err);
    }
  }

  public logOutgoingRequest(
    traceId: string,
    provider: string,
    model: string,
    payload: { messages: any[]; options?: any }
  ) {
    this.writeEntry({
      timestamp: new Date().toISOString(),
      traceId,
      type: 'request',
      provider,
      model,
      data: payload,
    });
  }

  public logIncomingResponse(
    traceId: string,
    provider: string,
    model: string,
    durationMs: number,
    fullText: string,
    error?: string
  ) {
    this.writeEntry({
      timestamp: new Date().toISOString(),
      traceId,
      type: error ? 'error' : 'response',
      provider,
      model,
      durationMs,
      data: { responseLength: fullText.length, responseSnippet: fullText.slice(0, 500) },
      error,
    });
  }

  public logToolCall(
    traceId: string,
    toolName: string,
    inputs: any,
    output: any,
    durationMs: number,
    error?: string
  ) {
    this.writeEntry({
      timestamp: new Date().toISOString(),
      traceId,
      type: 'tool_call',
      durationMs,
      data: {
        toolName,
        inputs,
        outputSnippet: typeof output === 'string' ? output.slice(0, 500) : output,
      },
      error,
    });
  }

  public async openCurrentLogFile() {
    const filePath = this.getLogFilePath();
    this.ensureLogDir();

    if (!fs.existsSync(filePath)) {
      // Create empty file if not yet created
      fs.writeFileSync(filePath, '', 'utf-8');
    }

    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  public showOutputChannel() {
    this.outputChannel.show(true);
  }
}
