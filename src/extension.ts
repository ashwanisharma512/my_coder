import * as vscode from 'vscode';
import { SecretManager } from './providers/SecretManager';
import { SidebarViewProvider } from './providers/SidebarViewProvider';
import { RequestLogger } from './services/logger/RequestLogger';
import { UsageTracker } from './services/metrics/UsageTracker';
import { ToolRegistry } from './tools/ToolRegistry';
import { SessionManager } from './services/session/SessionManager';

export function activate(context: vscode.ExtensionContext) {
  const secretManager = new SecretManager(context.secrets);
  const logger = new RequestLogger(context);
  const usageTracker = new UsageTracker(context.globalState);
  const toolRegistry = new ToolRegistry(logger);
  const sessionManager = new SessionManager(context);

  const sidebarProvider = new SidebarViewProvider(
    context.extensionUri,
    secretManager,
    logger,
    usageTracker,
    toolRegistry,
    sessionManager
  );

  // Register Webview View Provider for the sidebar view container
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarViewProvider.viewType,
      sidebarProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );

  // Command: Open Chat view
  context.subscriptions.push(
    vscode.commands.registerCommand('my-coder.openChat', () => {
      vscode.commands.executeCommand('my-coder.chatView.focus');
    })
  );

  // Command: Add selected text to chat
  context.subscriptions.push(
    vscode.commands.registerCommand('my-coder.addSelectionToChat', () => {
      sidebarProvider.sendSelectionToChat();
    })
  );

  // Command: New chat
  context.subscriptions.push(
    vscode.commands.registerCommand('my-coder.newChat', () => {
      vscode.commands.executeCommand('my-coder.chatView.focus');
    })
  );

  // Command: Open Request Log file
  context.subscriptions.push(
    vscode.commands.registerCommand('my-coder.openLogs', async () => {
      await logger.openCurrentLogFile();
    })
  );

  console.log('My Coder extension has been successfully activated.');
}

export function deactivate() {}
