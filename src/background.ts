import { ExtensionServiceWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let webllmHandler: ExtensionServiceWorkerMLCEngineHandler;

chrome.runtime.onConnect.addListener(function (port) {
  if (webllmHandler === undefined) {
    webllmHandler = new ExtensionServiceWorkerMLCEngineHandler(port);
  } else {
    webllmHandler.setPort(port);
  }
  port.onMessage.addListener(webllmHandler.onmessage.bind(webllmHandler));
});

console.log("Event listener registered");
