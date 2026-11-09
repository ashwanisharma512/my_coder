import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { ToolDefinition, ToolExecutionResult } from './types';
import { RequestLogger } from '../services/logger/RequestLogger';

export class ToolRegistry {
  constructor(private readonly logger: RequestLogger) {}

  public getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'read_file',
        description:
          'Read the contents of a file in the workspace. Supports reading specific line ranges.',
        parameters: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Relative or absolute path to the file to read.',
            },
            startLine: {
              type: 'number',
              description: 'Optional 1-based start line number to read from.',
            },
            endLine: {
              type: 'number',
              description: 'Optional 1-based end line number to read until.',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'write_file',
        description:
          'Create a new file or overwrite an existing file in the workspace with new content.',
        parameters: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Relative or absolute path to the file to write.',
            },
            content: {
              type: 'string',
              description: 'The full text content to write into the file.',
            },
          },
          required: ['filePath', 'content'],
        },
      },
      {
        name: 'edit_file',
        description:
          'Replace an exact section of code in an existing file using search and replace.',
        parameters: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Relative or absolute path to the file to modify.',
            },
            target: {
              type: 'string',
              description: 'Exact text segment to replace.',
            },
            replacement: {
              type: 'string',
              description: 'The new text to replace the target with.',
            },
          },
          required: ['filePath', 'target', 'replacement'],
        },
      },
      {
        name: 'list_files',
        description:
          'List directory contents or find files matching a search query in the workspace.',
        parameters: {
          type: 'object',
          properties: {
            directory: {
              type: 'string',
              description: 'Relative directory to list. Defaults to root workspace.',
            },
            recursive: {
              type: 'boolean',
              description: 'Whether to list recursively (excluding node_modules, .git).',
            },
          },
        },
      },
      {
        name: 'execute_command',
        description:
          'Execute a shell command (PowerShell / Bash) inside the workspace root and return output.',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The shell command line string to run.',
            },
          },
          required: ['command'],
        },
      },
    ];
  }

  public resolveWorkspacePath(targetPath: string): string {
    if (path.isAbsolute(targetPath)) {
      return targetPath;
    }
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return path.resolve(targetPath);
    }
    return path.resolve(workspaceRoot, targetPath);
  }

  public async showVisualDiff(filePath: string, originalContent: string, proposedContent: string) {
    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const diffDir = workspaceRoot
        ? path.join(workspaceRoot, '.my_coder', 'diffs')
        : path.join(path.dirname(filePath), '.my_coder', 'diffs');

      if (!fs.existsSync(diffDir)) {
        fs.mkdirSync(diffDir, { recursive: true });
      }

      const basename = path.basename(filePath);
      const proposedPath = path.join(diffDir, `proposed_${basename}`);
      fs.writeFileSync(proposedPath, proposedContent, 'utf-8');

      const originalUri = vscode.Uri.file(this.resolveWorkspacePath(filePath));
      const proposedUri = vscode.Uri.file(proposedPath);

      await vscode.commands.executeCommand(
        'vscode.diff',
        originalUri,
        proposedUri,
        `Proposed Changes: ${basename}`
      );
    } catch (err) {
      console.error('Failed to open visual diff:', err);
    }
  }

  public async searchWorkspaceFiles(query: string): Promise<string[]> {
    try {
      const uris = await vscode.workspace.findFiles('**/*', '{**/node_modules/**,**/.git/**,**/dist/**,**/.my_coder/**}', 50);
      const relativePaths = uris.map((u) => vscode.workspace.asRelativePath(u));
      if (!query.trim()) {
        return relativePaths.slice(0, 20);
      }
      const q = query.toLowerCase();
      return relativePaths.filter((p) => p.toLowerCase().includes(q)).slice(0, 20);
    } catch {
      return [];
    }
  }

  public async executeTool(
    traceId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    let result: ToolExecutionResult;

    try {
      switch (toolName) {
        case 'read_file':
          result = await this.executeReadFile(args as any);
          break;
        case 'write_file':
          result = await this.executeWriteFile(args as any);
          break;
        case 'edit_file':
          result = await this.executeEditFile(args as any);
          break;
        case 'list_files':
          result = await this.executeListFiles(args as any);
          break;
        case 'execute_command':
          result = await this.executeCommand(args as any);
          break;
        default:
          result = {
            success: false,
            output: '',
            error: `Unknown tool: ${toolName}`,
          };
      }
    } catch (err: any) {
      result = {
        success: false,
        output: '',
        error: err.message || String(err),
      };
    }

    const durationMs = Date.now() - startTime;
    this.logger.logToolCall(
      traceId,
      toolName,
      args,
      result.output,
      durationMs,
      result.error
    );

    return result;
  }

  private async executeReadFile(args: {
    filePath: string;
    startLine?: number;
    endLine?: number;
  }): Promise<ToolExecutionResult> {
    const fullPath = this.resolveWorkspacePath(args.filePath);
    if (!fs.existsSync(fullPath)) {
      return { success: false, output: '', error: `File not found: ${args.filePath}` };
    }

    const text = fs.readFileSync(fullPath, 'utf-8');
    const lines = text.split('\n');

    const start = args.startLine ? Math.max(1, args.startLine) : 1;
    const end = args.endLine ? Math.min(lines.length, args.endLine) : lines.length;

    const selectedLines = lines.slice(start - 1, end);
    const numbered = selectedLines.map((l, idx) => `${start + idx}: ${l}`).join('\n');

    return {
      success: true,
      output: `File: ${args.filePath} (Lines ${start}-${end} of ${lines.length}):\n${numbered}`,
    };
  }

  private async executeWriteFile(args: {
    filePath: string;
    content: string;
  }): Promise<ToolExecutionResult> {
    const fullPath = this.resolveWorkspacePath(args.filePath);
    const parentDir = path.dirname(fullPath);

    if (fs.existsSync(fullPath)) {
      const original = fs.readFileSync(fullPath, 'utf-8');
      await this.showVisualDiff(args.filePath, original, args.content);
    }

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, args.content, 'utf-8');

    return {
      success: true,
      output: `Successfully wrote ${args.content.length} characters to ${args.filePath}`,
    };
  }

  private async executeEditFile(args: {
    filePath: string;
    target: string;
    replacement: string;
  }): Promise<ToolExecutionResult> {
    const fullPath = this.resolveWorkspacePath(args.filePath);
    if (!fs.existsSync(fullPath)) {
      return { success: false, output: '', error: `File not found: ${args.filePath}` };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    if (!content.includes(args.target)) {
      return {
        success: false,
        output: '',
        error: `Target string was not found in ${args.filePath}. Ensure exact whitespace match.`,
      };
    }

    const updated = content.replace(args.target, args.replacement);

    // Show side-by-side diff in VS Code
    await this.showVisualDiff(args.filePath, content, updated);

    fs.writeFileSync(fullPath, updated, 'utf-8');

    return {
      success: true,
      output: `Successfully updated ${args.filePath}.`,
    };
  }

  private async executeListFiles(args: {
    directory?: string;
    recursive?: boolean;
  }): Promise<ToolExecutionResult> {
    const dir = this.resolveWorkspacePath(args.directory || '.');
    if (!fs.existsSync(dir)) {
      return { success: false, output: '', error: `Directory not found: ${dir}` };
    }

    const ignored = new Set(['node_modules', '.git', 'dist', 'out', '.my_coder', '.vscode']);
    const entries: string[] = [];

    const walk = (currentDir: string, depth = 0) => {
      if (depth > 4) return;
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const item of items) {
        if (ignored.has(item.name)) continue;
        const relative = path.relative(dir, path.join(currentDir, item.name));
        if (item.isDirectory()) {
          entries.push(`${relative}/`);
          if (args.recursive) {
            walk(path.join(currentDir, item.name), depth + 1);
          }
        } else {
          entries.push(relative);
        }
      }
    };

    walk(dir, 0);

    return {
      success: true,
      output: entries.length > 0 ? entries.slice(0, 100).join('\n') : 'Empty directory',
    };
  }

  private async executeCommand(args: { command: string }): Promise<ToolExecutionResult> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

    return new Promise((resolve) => {
      exec(
        args.command,
        {
          cwd: workspaceRoot,
          timeout: 30000,
          maxBuffer: 1024 * 1024,
        },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              output: stdout || '',
              error: stderr || error.message,
            });
          } else {
            resolve({
              success: true,
              output: stdout || (stderr ? `[stderr]\n${stderr}` : '(Command executed with no output)'),
            });
          }
        }
      );
    });
  }
}
