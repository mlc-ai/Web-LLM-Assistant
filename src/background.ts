import { ExtensionServiceWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let webllmHandler: ExtensionServiceWorkerMLCEngineHandler;
let loaded = false;

// Set reponse callback for chat module
const generateProgressCallback = (_step: number, message: string) => {
  // send the answer back to the content script
  console.log("background msg:", message);
  console.log("step:", _step);

  // Send message to content script
  const query = { active: true, currentWindow: true };
  chrome.tabs.query(query, (tabs) => {
    tabs[0]?.id &&
      chrome.tabs.sendMessage(tabs[0].id, {
        message: message,
      });
  });

  // Send message to popup script
  chrome.runtime.sendMessage({ answer: message });
};

chrome.runtime.onConnect.addListener(function (port) {
  if (webllmHandler === undefined) {
    webllmHandler = new ExtensionServiceWorkerMLCEngineHandler(port);
  } else {
    webllmHandler.setPort(port);
  }
  port.onMessage.addListener(webllmHandler.onmessage.bind(webllmHandler));
});
