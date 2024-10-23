import { tool, State } from "@mlc-ai/web-agent-interface";

const state = new State();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("received message", message);
  if (message.action === "function_call") {
    const { function_name, parameters } = message;
    console.log("Message received from popup:", function_name, parameters);
    try {
      const response = tool[function_name].implementation(state, parameters);
      console.log("handler response", response);
      sendResponse(response);
    } catch (error) {
      console.error("Error in handler response", error);
      sendResponse({ error: error.message });
    }
  }
});
