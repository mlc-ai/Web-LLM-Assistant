import { tool, State, Scope } from "@mlc-ai/web-agent-interface";

const state = new State();

const getScopeForPage = (): Scope | null => {
  const currentUrl = window.location.href;
  if (/^https:\/\/www\.overleaf\.com\/project\/.+$/.test(currentUrl)) {
    /* Overleaf document */
    return Scope.Overleaf;
  }
  return null;
}

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
  } else if (message.action === "get_scope") {
    sendResponse({ scope: getScopeForPage() });
  }
});
