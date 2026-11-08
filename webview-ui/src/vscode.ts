import { WebviewMessage } from '../../src/shared/protocol';

interface VsCodeApi {
  postMessage: (message: WebviewMessage) => void;
  getState: () => any;
  setState: (state: any) => void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let vscodeApi: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
  if (!vscodeApi) {
    if (typeof acquireVsCodeApi !== 'undefined') {
      vscodeApi = acquireVsCodeApi();
    } else {
      // Mock for browser dev environment
      console.warn('VS Code API not available. Using mock postMessage.');
      vscodeApi = {
        postMessage: (msg: WebviewMessage) => console.log('Mock postMessage:', msg),
        getState: () => ({}),
        setState: (st: any) => console.log('Mock setState:', st),
      };
    }
  }
  return vscodeApi;
}
