import { isPageSupported } from "@mlc-ai/web-agent-interface";
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

function getIconPaths(supported: boolean) {
  const iconPrefix = supported ? "icon" : "icon-gray";
  return {
    16: `icons/${iconPrefix}-16.png`,
    32: `icons/${iconPrefix}-32.png`,
    48: `icons/${iconPrefix}-64.png`,
    128: `icons/${iconPrefix}-128.png`,
  };
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error("Error getting tab info:", chrome.runtime.lastError);
      return;
    }

    if (tab.url) {
      const url = new URL(tab.url);
      const hostname = url.hostname;
      const iconPaths = getIconPaths(isPageSupported(hostname));

      chrome.action.setIcon(
        { path: iconPaths, tabId: activeInfo.tabId },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Error setting icon:", chrome.runtime.lastError);
          }
        },
      );
    }
  });
});

console.log("Event listener registered");
