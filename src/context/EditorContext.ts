import * as vscode from 'vscode';
import { ActiveContext } from '../shared/protocol';

export class EditorContext {
  public static getActiveContext(): ActiveContext {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return { hasSelection: false };
    }

    const document = editor.document;
    const selection = editor.selection;
    const selectedText = !selection.isEmpty ? document.getText(selection) : undefined;
    const relativePath = vscode.workspace.asRelativePath(document.uri);

    return {
      fileName: document.fileName.split(/[/\\]/).pop(),
      filePath: relativePath,
      languageId: document.languageId,
      selectedText,
      hasSelection: !!selectedText && selectedText.trim().length > 0,
    };
  }

  public static getActiveFileFullContent(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return undefined;
    }
    return editor.document.getText();
  }
}
