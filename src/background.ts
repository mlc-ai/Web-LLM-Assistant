import { ExtensionServiceWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let webllmHandler: ExtensionServiceWorkerMLCEngineHandler;
const pendingPromise = new Map<string, (msg: any) => void>();

chrome.runtime.onConnect.addListener(function (port) {
  if (webllmHandler === undefined) {
    webllmHandler = new ExtensionServiceWorkerMLCEngineHandler(port);
  } else {
    webllmHandler.setPort(port);
  }
  port.onMessage.addListener(webllmHandler.onmessage.bind(webllmHandler));
});
