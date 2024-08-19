import { OverleafPage } from "@mlc-ai/web-agent-interface";

const overleaf = new OverleafPage();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("received message", message);
  if (message.action === "function_call") {
    const { function_name, parameters } = message;
    console.log("Message received from popup:", function_name, parameters);
    const response = overleaf.executeAction(function_name, ...parameters);
    sendResponse(response);
  }
});

console.log("MLC Assistant content script is running");