/**
 * VS Code Remote Operator via Chrome DevTools Protocol (CDP)
 * Full interactive automation of the VS Code window & My Coder sidebar
 */
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9222;

async function getTargets() {
  const res = await fetch(`http://localhost:${CDP_PORT}/json/list`);
  return await res.json();
}

function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => resolve(ws);
    ws.onerror = (err) => reject(err);
  });
}

function sendCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.result);
        }
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function getWebviewTarget() {
  const targets = await getTargets();
  const webview = targets.find((t) => t.url && t.url.includes('extensionId=personal.my-coder')) ||
                  targets.find((t) => t.type === 'iframe' && t.url && t.url.includes('vscode-webview'));
  if (!webview) {
    throw new Error('Could not find My Coder webview target.');
  }
  return webview;
}

async function getWorkbenchTarget() {
  const targets = await getTargets();
  const workbench = targets.find((t) => t.type === 'page');
  if (!workbench) {
    throw new Error('Could not find VS Code workbench page target.');
  }
  return workbench;
}

async function evalInWebviewInner(expression) {
  const webview = await getWebviewTarget();
  const ws = await connectWs(webview.webSocketDebuggerUrl);
  try {
    const wrapped = `
      (() => {
        const frame = document.getElementById('active-frame');
        const doc = frame && frame.contentDocument ? frame.contentDocument : document;
        const win = frame && frame.contentWindow ? frame.contentWindow : window;
        return (${expression})(doc, win);
      })()
    `;
    const result = await sendCommand(ws, 'Runtime.evaluate', {
      expression: wrapped,
      returnByValue: true,
      awaitPromise: true,
    });
    return result.result?.value;
  } finally {
    ws.close();
  }
}

async function takeScreenshot(target, outputPath) {
  const ws = await connectWs(target.webSocketDebuggerUrl);
  try {
    const result = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  } finally {
    ws.close();
  }
}

async function main() {
  const [,, command, ...args] = process.argv;

  switch (command) {
    case 'status': {
      const targets = await getTargets();
      console.log('Connected to VS Code CDP on port', CDP_PORT);
      const res = await evalInWebviewInner(`(doc) => {
        const textarea = doc.querySelector('textarea');
        const select = doc.querySelector('select');
        const msgs = Array.from(doc.querySelectorAll('.select-text')).map(el => el.innerText.trim()).filter(Boolean);
        return {
          model: select ? select.value : 'none',
          messageCount: msgs.length,
          hasInput: !!textarea,
          recentSnippet: msgs.slice(-2).join(' | ').slice(0, 200)
        };
      }`);
      console.log('My Coder Status:', JSON.stringify(res, null, 2));
      break;
    }

    case 'send-prompt': {
      const promptText = args.join(' ');
      const res = await evalInWebviewInner(`(doc) => {
        const textarea = doc.querySelector('textarea');
        if (!textarea) return { success: false, error: 'Textarea not found' };
        
        // React 16+ value setter bypass
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(textarea, ${JSON.stringify(promptText)});
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        // Find send button
        const sendBtn = doc.querySelector('button[title*="Send"]') || doc.querySelector('button[type="submit"]');
        if (sendBtn) {
          sendBtn.click();
          return { success: true, method: 'button_click', text: ${JSON.stringify(promptText)} };
        }

        // Fallback: Enter key
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        return { success: true, method: 'enter_key' };
      }`);
      console.log('Send prompt result:', res);
      break;
    }

    case 'select-model': {
      const modelId = args[0];
      const res = await evalInWebviewInner(`(doc) => {
        const select = doc.querySelector('select');
        if (!select) return { success: false, error: 'Select dropdown not found' };
        select.value = ${JSON.stringify(modelId)};
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, newModel: select.value };
      }`);
      console.log('Select model result:', res);
      break;
    }

    case 'get-messages': {
      const res = await evalInWebviewInner(`(doc) => {
        const msgItems = Array.from(doc.querySelectorAll('.border-b.border-vscode-border\\\/50, .select-text'));
        return Array.from(doc.querySelectorAll('.select-text'))
          .map(el => el.innerText.trim())
          .filter(t => t.length > 0 && !t.includes('Claude 3.7') && !t.includes('Gemini 3.8'));
      }`);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'new-chat': {
      const res = await evalInWebviewInner(`(doc) => {
        const btn = doc.querySelector('button[title="New Chat"]');
        if (btn) {
          btn.click();
          return { success: true };
        }
        return { success: false, error: 'New Chat button not found' };
      }`);
      console.log('New chat result:', res);
      break;
    }

    case 'screenshot': {
      const outFile = args[0] || path.join(__dirname, 'workbench.png');
      const workbench = await getWorkbenchTarget();
      await takeScreenshot(workbench, outFile);
      console.log('Saved screenshot to:', outFile);
      break;
    }

    default:
      console.log('Usage: node operate_vscode.js [status|send-prompt|select-model|get-messages|new-chat|screenshot]');
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
