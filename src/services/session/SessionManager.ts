import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChatSession, ProviderType, SessionSummary } from '../../shared/protocol';

export class SessionManager {
  private static readonly ACTIVE_SESSION_KEY = 'my_coder_active_session_id';
  private sessionsDir: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      this.sessionsDir = path.join(workspaceFolder.uri.fsPath, '.my_coder', 'sessions');
    } else {
      this.sessionsDir = path.join(this.context.globalStorageUri.fsPath, 'sessions');
    }

    this.ensureDir();
  }

  private ensureDir() {
    try {
      if (!fs.existsSync(this.sessionsDir)) {
        fs.mkdirSync(this.sessionsDir, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to create sessions directory:', err);
    }
  }

  private getSessionFilePath(id: string): string {
    return path.join(this.sessionsDir, `session_${id}.json`);
  }

  public getActiveSessionId(): string | undefined {
    return this.context.globalState.get<string>(SessionManager.ACTIVE_SESSION_KEY);
  }

  public async setActiveSessionId(id: string): Promise<void> {
    await this.context.globalState.update(SessionManager.ACTIVE_SESSION_KEY, id);
  }

  public createSession(provider: ProviderType, model: string): ChatSession {
    this.ensureDir();
    const id = Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6);
    const newSession: ChatSession = {
      id,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      provider,
      model,
      messages: [],
    };

    this.saveSession(newSession);
    this.setActiveSessionId(id);
    return newSession;
  }

  public loadSession(id: string): ChatSession | undefined {
    try {
      const filePath = this.getSessionFilePath(id);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data) as ChatSession;
      }
    } catch (err) {
      console.error(`Failed to load session ${id}:`, err);
    }
    return undefined;
  }

  public saveSession(session: ChatSession): void {
    try {
      this.ensureDir();
      session.updatedAt = Date.now();

      // Auto-generate title if still 'New Chat' and has at least one user message
      if (session.title === 'New Chat' && session.messages.length > 0) {
        const firstUser = session.messages.find((m) => m.role === 'user');
        if (firstUser) {
          const raw = firstUser.content.trim().replace(/\n/g, ' ');
          session.title = raw.length > 40 ? raw.slice(0, 37) + '...' : raw;
        }
      }

      const filePath = this.getSessionFilePath(session.id);
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
    } catch (err) {
      console.error(`Failed to save session ${session.id}:`, err);
    }
  }

  public deleteSession(id: string): void {
    try {
      const filePath = this.getSessionFilePath(id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete session ${id}:`, err);
    }
  }

  public getOrCreateActiveSession(provider: ProviderType, model: string): ChatSession {
    const activeId = this.getActiveSessionId();
    if (activeId) {
      const existing = this.loadSession(activeId);
      if (existing) {
        return existing;
      }
    }

    // Otherwise check if any existing session exists in directory
    const list = this.listSessions();
    if (list.length > 0) {
      const mostRecent = this.loadSession(list[0].id);
      if (mostRecent) {
        this.setActiveSessionId(mostRecent.id);
        return mostRecent;
      }
    }

    return this.createSession(provider, model);
  }

  public listSessions(): SessionSummary[] {
    this.ensureDir();
    const summaries: SessionSummary[] = [];

    try {
      const files = fs.readdirSync(this.sessionsDir);
      for (const file of files) {
        if (file.startsWith('session_') && file.endsWith('.json')) {
          try {
            const raw = fs.readFileSync(path.join(this.sessionsDir, file), 'utf-8');
            const parsed = JSON.parse(raw) as ChatSession;
            summaries.push({
              id: parsed.id,
              title: parsed.title || 'Untitled Chat',
              createdAt: parsed.createdAt || 0,
              updatedAt: parsed.updatedAt || 0,
              messageCount: parsed.messages?.length || 0,
              provider: parsed.provider || 'gemini',
              model: parsed.model || 'gemini-3.8-flash',
            });
          } catch {
            // Ignore malformed session files
          }
        }
      }
    } catch (err) {
      console.error('Failed to list sessions:', err);
    }

    // Sort by most recently updated first
    return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
