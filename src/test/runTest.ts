import * as path from 'path';
import * as fs from 'fs';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // Crucial for running inside VS Code / Electron terminal:
    // Unset ELECTRON_RUN_AS_NODE so Code.exe launches as the full GUI Electron application
    delete process.env.ELECTRON_RUN_AS_NODE;

    // The folder containing the Extension Manifest package.json
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to test runner script
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Create or use a dedicated test workspace
    const testWorkspace = path.resolve(__dirname, '../../test-workspace');
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }

    console.log('----------------------------------------------------');
    console.log('Starting VS Code in Headed Mode for My Coder Tests');
    console.log('Extension path: ', extensionDevelopmentPath);
    console.log('Tests path:     ', extensionTestsPath);
    console.log('Workspace:      ', testWorkspace);
    console.log('----------------------------------------------------');

    // Launch standalone portable VS Code in Headed Mode
    // Version '1.94.0' or 'stable' downloaded cleanly to .vscode-test
    await runTests({
      version: '1.94.0',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspace,
        '--disable-extensions', // Disable other third-party extensions
      ],
    });

    console.log('\n[SUCCESS] All My Coder headed tests passed!\n');
  } catch (err) {
    console.error('\n[ERROR] Failed to run headed tests:', err);
    process.exit(1);
  }
}

main();
