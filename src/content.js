import {
  isCurrentPageSupported,
  initHandler,
} from "@mlc-ai/web-agent-interface";

let handler = null;
if (isCurrentPageSupported()) {
  handler = initHandler();
  console.log("WAI handler intialized");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("received message", message);
  if (message.action === "function_call") {
    const { function_name, parameters } = message;
    console.log("Message received from popup:", function_name, parameters);
    try {
      const response = handler.handleToolCall(function_name, parameters);
      console.log("handler response", response);
      sendResponse(response);
    } catch (error) {
      console.error("Error in handler response", error);
      sendResponse({ error: error.message });
    }
  }
});
