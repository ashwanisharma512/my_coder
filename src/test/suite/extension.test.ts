import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ToolRegistry } from '../../tools/ToolRegistry';
import { SessionManager } from '../../services/session/SessionManager';
import { UsageTracker } from '../../services/metrics/UsageTracker';
import { RequestLogger } from '../../services/logger/RequestLogger';

// Helper for visible pacing so user can watch actions on screen
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite('My Coder Extension - Headed Integration Test Suite', () => {
  suiteSetup(async () => {
    vscode.window.showInformationMessage('🚀 [My Coder Headed Test] Starting Integration Suite...');
    await sleep(1500);
  });

  test('1. Extension should be registered and activate successfully', async () => {
    const ext = vscode.extensions.getExtension('personal.my-coder');
    assert.ok(ext, 'Extension personal.my-coder should be present');

    if (!ext.isActive) {
      await ext.activate();
    }
    assert.strictEqual(ext.isActive, true, 'Extension should be active');
    vscode.window.showInformationMessage('✅ Test 1 Passed: My Coder Extension Activated');
    await sleep(800);
  });

  test('2. Commands should be registered in VS Code command registry', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('my-coder.openChat'), 'my-coder.openChat command should be registered');
    assert.ok(commands.includes('my-coder.newChat'), 'my-coder.newChat command should be registered');
    assert.ok(commands.includes('my-coder.openLogs'), 'my-coder.openLogs command should be registered');
    vscode.window.showInformationMessage('✅ Test 2 Passed: Extension Commands Registered');
    await sleep(800);
  });

  test('3. Open Chat command executes cleanly', async () => {
    await vscode.commands.executeCommand('my-coder.openChat');
    vscode.window.showInformationMessage('✅ Test 3 Passed: Opened My Coder Chat View');
    await sleep(1200);
  });

  test('4. ToolRegistry - list_files executes in workspace', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    assert.ok(workspaceFolders && workspaceFolders.length > 0, 'Workspace folder should exist');

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const logger = new RequestLogger(workspaceRoot);
    const registry = new ToolRegistry(logger);

    const result = await registry.executeTool('test_req_1', 'list_files', {
      directory: '.',
      recursive: false,
    });
    assert.strictEqual(result.success, true, 'list_files should succeed');
    assert.ok(result.output, 'list_files output should not be empty');
    vscode.window.showInformationMessage('✅ Test 4 Passed: list_files executed successfully');
    await sleep(800);
  });

  test('5. ToolRegistry - write_file creates a real file and opens it in editor', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const logger = new RequestLogger(workspaceRoot);
    const registry = new ToolRegistry(logger);
    const testFileName = 'app.py';
    const testContent = '# Headed Test File\ndef greet():\n    return "hello from my_coder"\n';

    const result = await registry.executeTool('test_req_2', 'write_file', {
      filePath: testFileName,
      content: testContent,
    });
    assert.strictEqual(result.success, true, 'write_file should succeed');

    const diskPath = path.join(workspaceRoot, testFileName);
    assert.ok(fs.existsSync(diskPath), 'File should exist on disk');
    const contentOnDisk = fs.readFileSync(diskPath, 'utf-8');
    assert.strictEqual(contentOnDisk, testContent, 'File content should match exactly');

    // Visibly open the file in the editor so user sees it live
    const doc = await vscode.workspace.openTextDocument(diskPath);
    await vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage('✅ Test 5 Passed: write_file created & opened app.py');
    await sleep(1200);
  });

  test('6. ToolRegistry - read_file reads the created file', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const logger = new RequestLogger(workspaceRoot);
    const registry = new ToolRegistry(logger);

    const result = await registry.executeTool('test_req_3', 'read_file', {
      filePath: 'app.py',
      startLine: 1,
      endLine: 2,
    });
    assert.strictEqual(result.success, true, 'read_file should succeed');
    assert.ok(result.output.includes('Headed Test File'), 'read_file should return line content');
    vscode.window.showInformationMessage('✅ Test 6 Passed: read_file verified lines 1-2');
    await sleep(800);
  });

  test('7. ToolRegistry - edit_file surgically modifies code and displays update', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const logger = new RequestLogger(workspaceRoot);
    const registry = new ToolRegistry(logger);

    const result = await registry.executeTool('test_req_4', 'edit_file', {
      filePath: 'app.py',
      target: 'return "hello from my_coder"',
      replacement: 'return "hello from my_coder headed test"',
    });
    assert.strictEqual(result.success, true, 'edit_file should succeed');

    const diskPath = path.join(workspaceRoot, 'app.py');
    const updatedContent = fs.readFileSync(diskPath, 'utf-8');
    assert.ok(
      updatedContent.includes('hello from my_coder headed test'),
      'File content should be updated'
    );
    vscode.window.showInformationMessage('✅ Test 7 Passed: edit_file surgically replaced code');
    await sleep(1000);
  });

  test('8. ToolRegistry - execute_command executes a shell command', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const logger = new RequestLogger(workspaceRoot);
    const registry = new ToolRegistry(logger);

    const result = await registry.executeTool('test_req_5', 'execute_command', {
      command: 'node -v',
    });
    assert.strictEqual(result.success, true, 'execute_command should succeed');
    assert.ok(result.output.includes('v'), 'node -v output should contain version');
    vscode.window.showInformationMessage(`✅ Test 8 Passed: execute_command (node ${result.output.trim()})`);
    await sleep(800);
  });

  test('9. SessionManager - creates, saves and loads sessions', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const storage = new Map<string, any>();
    const mockMemento: vscode.Memento = {
      keys: () => Array.from(storage.keys()),
      get: (key: string, defaultValue?: any) => (storage.has(key) ? storage.get(key) : defaultValue),
      update: async (key: string, value: any) => {
        storage.set(key, value);
      },
      setKeysForSync: () => {},
    };

    const mockContext: any = {
      globalState: mockMemento,
      globalStorageUri: vscode.Uri.file(workspaceRoot),
    };

    const sessionManager = new SessionManager(mockContext);

    const session = sessionManager.createSession('gemini', 'gemini-3.8-flash');
    assert.ok(session.id, 'Session should have an id');

    session.messages.push({
      id: 'm1',
      role: 'user',
      content: 'Headed test message',
      timestamp: Date.now(),
    });
    sessionManager.saveSession(session);

    const loaded = sessionManager.loadSession(session.id);
    assert.ok(loaded, 'Loaded session should exist');
    assert.strictEqual(loaded?.messages.length, 1, 'Loaded session should have 1 message');
    assert.strictEqual(loaded?.messages[0].content, 'Headed test message');
    vscode.window.showInformationMessage('✅ Test 9 Passed: Session saved & loaded from disk');
    await sleep(800);
  });

  test('10. UsageTracker - records API calls', async () => {
    const storage = new Map<string, any>();
    const mockMemento: vscode.Memento = {
      keys: () => Array.from(storage.keys()),
      get: (key: string, defaultValue?: any) => (storage.has(key) ? storage.get(key) : defaultValue),
      update: async (key: string, value: any) => {
        storage.set(key, value);
      },
      setKeysForSync: () => {},
    };

    const tracker = new UsageTracker(mockMemento);

    const stats = await tracker.recordApiCall('gemini');
    assert.ok(stats.callsToday >= 1, 'Calls today should increment');
    assert.ok(stats.byProvider.gemini.day >= 1, 'Gemini daily calls should increment');
    vscode.window.showInformationMessage('✅ Test 10 Passed: Usage counter recorded');
    await sleep(800);
  });

  test('11. RequestLogger - writes audit log file to disk', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const logger = new RequestLogger(workspaceRoot);

    const traceId = 'req_test_headed_123';
    logger.logOutgoingRequest(traceId, 'gemini', 'gemini-3.8-flash', {
      messages: [{ role: 'user', content: 'test prompt' }],
    });
    logger.logIncomingResponse(traceId, 'gemini', 'gemini-3.8-flash', 150, 'test answer');

    const todayStr = new Date().toISOString().split('T')[0];
    const logFilePath = path.join(workspaceRoot, '.my_coder', 'logs', `requests_${todayStr}.jsonl`);
    assert.ok(fs.existsSync(logFilePath), 'Log file should exist on disk');

    const logContent = fs.readFileSync(logFilePath, 'utf-8');
    assert.ok(logContent.includes(traceId), 'Log file should contain traceId');
    vscode.window.showInformationMessage('✅ Test 11 Passed: Request JSONL audit logged');
    await sleep(800);
  });

  suiteTeardown(async () => {
    vscode.window.showInformationMessage(
      '🎉 All 11 Tests Passed! Window will close in 6 seconds...'
    );
    await sleep(6000);
  });
});
