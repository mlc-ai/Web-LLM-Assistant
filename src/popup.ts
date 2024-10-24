import {
  CallerType,
  Scope,
  State,
  tool,
  ToolName,
} from "@mlc-ai/web-agent-interface";
import {
  ChatCompletionMessageParam,
  ExtensionServiceWorkerMLCEngine,
} from "@mlc-ai/web-llm";
import { get_system_prompt } from "./prompt";
import showdown from "showdown";
import {
  createElement,
  createIcons,
  Send,
  LoaderCircle,
  RotateCw,
} from "lucide";

const markdownRenderer = new showdown.Converter({
  simplifiedAutoLink: true,
  excludeTrailingPunctuationFromURLs: true,
  openLinksInNewWindow: true,
});

const state = new State();

const engine = new ExtensionServiceWorkerMLCEngine({
  initProgressCallback: (progress) => {
    console.log(progress.text);
    const match = progress.text.match(/\[(\d+)\/(\d+)]/);
    if (match) {
      const progress = parseInt(match[1], 10);
      const totalProgress = parseInt(match[2], 10);
      updateInitProgressBar(progress / totalProgress);
    } else {
      updateInitProgressBar(progress.progress);
    }
  },
});
window.addEventListener("load", () => {
  createIcons({
    icons: {
      Send,
      LoaderCircle,
      RotateCw,
    },
  });
  loadWebllmEngine();
});

const getScopeForPage = (url: string | undefined): Scope => {
  if (!url) {
    return Scope.Any;
  }
  if (/^https:\/\/www\.overleaf\.com\/project\/.+$/.test(url)) {
    /* Overleaf document */
    return Scope.Overleaf;
  }
  return Scope.Any;
};

const getCurrentActiveTabUrl: () => Promise<string | undefined> = async () =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      resolve(activeTab.url);
    });
  });

const sendMessageToContentScript = async (message: Object) => {
  const [tab] = await chrome.tabs.query({
    currentWindow: true,
    active: true,
  });
  if (tab.id) {
    return chrome.tabs.sendMessage(tab.id, message);
  }
};

let currentAnimation: string | null = null;
let pendingAnimationTick = -Infinity;
let pendingAnimationInterval: number | null = null;

const startPendingAnimation = (status: string) => {
  if (currentAnimation === status) {
    return;
  }
  answerDiv.classList.remove("hidden");
  answerDiv.textContent = "";
  stopPendingAnimation();

  currentAnimation = status;
  pendingAnimationTick = 0;
  pendingAnimationInterval = setInterval(() => {
    if (pendingAnimationTick >= 0) {
      answerDiv.textContent =
        status + ".".repeat((pendingAnimationTick % 3) + 1);
      pendingAnimationTick += 1;
    }
  }, 1000);
};

const stopPendingAnimation = () => {
  if (pendingAnimationInterval) {
    currentAnimation = null;
    pendingAnimationTick = -Infinity;
    clearInterval(pendingAnimationInterval);
    pendingAnimationInterval = null;
  }
};

const callToolFunction = async (functionCall: {
  name: ToolName;
  arguments?: Object;
}) => {
  const { name: function_name, arguments: parameters = {} } = functionCall;
  const caller = tool[function_name].caller;
  console.log("Call tool", function_name, parameters);
  if (caller === CallerType.ContentScript) {
    try {
      return await sendMessageToContentScript({
        action: "function_call",
        function_name,
        parameters,
      });
    } catch (e) {
      console.error(e);
      return { error: e.message };
    }
  }
  return tool[function_name].implementation(state, parameters);
};

let scope = Scope.Any;
let availableTools = Object.values(tool).filter(
  (t) => t.type === "action" && t.scope === Scope.Any,
);
const MAX_MESSAGES = 8;
let messages: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: get_system_prompt(availableTools),
  },
];
let lastQuery = "";
let isGenerating = false;

const updateScopeForPage = async () => {
  const url = await getCurrentActiveTabUrl();
  scope = getScopeForPage(url);
  availableTools = Object.values(tool).filter(
    (t) =>
      t.type === "action" &&
      (t.scope === Scope.Any || t.scope?.includes(scope)),
  );
  console.log("Updated page scope to " + scope);
  console.log("Updated available tools: " + availableTools.map((t) => t.name));
};
updateScopeForPage();

async function loadWebllmEngine() {
  const options = await chrome.storage.sync.get({
    temperature: 0.5,
    contextLength: 4096,
  });
  const selectedModel = "Hermes-3-Llama-3.1-8B-q4f32_1-MLC";
  await engine.reload(selectedModel, {
    context_window_size: options["contextLength"],
    temperature: options["temperature"],
  });
  console.log("Engine loaded.");
  console.log("Engine loaded.");
  enableSubmit();
  document.addEventListener("keydown", function (event) {
    const key = event.key;
    const input = document.getElementById("modalInput");
    if (key == "Enter" && input === document.activeElement) {
      handleSubmit(false);
    }
  });
}

const submitButton = document.getElementById("submit") as HTMLButtonElement;
const regenerateButton = document.getElementById(
  "regenerate",
) as HTMLButtonElement;
const modalInput = document.getElementById("modalInput") as HTMLInputElement;
const answerDiv = document.getElementById("answer") as HTMLElement;
const questionDiv = document.getElementById("question") as HTMLElement;

function hideInitContainer() {
  document.getElementById("init-container")?.classList.add("hidden");
}

function disableSubmit() {
  submitButton.disabled = true;
  submitButton.innerHTML = "";
  const icon = createElement(LoaderCircle);
  icon.classList.add("spin");
  submitButton.appendChild(icon);
  regenerateButton.classList.add("hidden");
  regenerateButton.disabled = true;
}

function enableSubmit() {
  submitButton.disabled = false;
  submitButton.innerHTML = "";
  submitButton.appendChild(createElement(Send));
  if (messages.length > 1) {
    regenerateButton.classList.remove("hidden");
    regenerateButton.disabled = false;
  }
}

async function handleSubmit(regenerate) {
  if (isGenerating) {
    return;
  }
  isGenerating = true;
  hideInitContainer();
  disableSubmit();

  if ((regenerate && !lastQuery) || (!regenerate && !modalInput.value)) {
    enableSubmit();
    return;
  }
  let query: string = "";
  if (regenerate) {
    query = lastQuery;
    if (messages[messages.length - 1].role === "assistant") {
      messages.pop();
    }
  } else {
    const pageContent = await callToolFunction({
      name: "getPageContent",
    });
    const currentSelection = await callToolFunction({
      name: "getSelectedText",
    });
    let context = `# Context\n\n`;
    const activeUrl = await getCurrentActiveTabUrl();
    if (activeUrl) {
      context += `### Current site url:\n${activeUrl}\n\n`;
    }
    if (pageContent) {
      context += `### Page content:\n${pageContent}\n\n`;
    }
    if (currentSelection) {
      console.log("currentSelection", currentSelection);
      context += `### User's current selected content:\n${currentSelection}\n\n`;
    }
    context += `### User's timezone:\n${Intl.DateTimeFormat().resolvedOptions().timeZone}\n\n`;
    context += `### Current Date and Time:\n${new Date().toISOString()}\n\n`;
    query = context + "\n\n# User Query:\n" + modalInput.value;
    modalInput.value = "";
    messages = [...messages, { role: "user", content: query }];
    lastQuery = query;
  }

  while (messages.length > MAX_MESSAGES) {
    messages.splice(1, 2); // Remove the message at index 1 (second element)
  }

  questionDiv.classList.remove("hidden");
  questionDiv.textContent = query.substring(
    query.lastIndexOf("# User Query:\n") + "# User Query:\n".length,
  );

  clearAnswer();
  startPendingAnimation("Loading");

  let curMessage = "";
  console.log("messages", messages);
  try {
    const completion = await engine.chat.completions.create({
      stream: true,
      messages,
      temperature: 0,
    });

    for await (const chunk of completion) {
      const curDelta = chunk.choices[0].delta.content;
      if (curDelta) {
        curMessage += curDelta;
      }
      await updateAnswer(curMessage);
    }

    const finalMessage = await engine.getMessage();
    console.log("Response", finalMessage);
    messages = [...messages, { role: "assistant", content: finalMessage }];
    updateAnswer(finalMessage);
  } catch (e) {
    console.error("Error while generating.", e);
    updateAnswer(e);
  } finally {
    isGenerating = false;
    enableSubmit();
  }
}

function clearAnswer() {
  const answerDiv = document.getElementById("answer") as HTMLElement;
  answerDiv.innerHTML = "";
}

async function updateAnswer(response: string) {
  // ignore scratchpad content and only show output
  const scratchpadIndex = response.indexOf("<scratchpad>");
  const outputIndex = response.indexOf("<output>");
  if (scratchpadIndex < 0 && outputIndex < 0) {
    // LLM doesn't follow the format. Directly output
  } else if (scratchpadIndex >= 0 && outputIndex < 0) {
    // LLM is thinking
    startPendingAnimation("Thinking");
    return;
  } else {
    // LLM has started generating output
    stopPendingAnimation();
    const outputEndIndex = response.indexOf("</output>");
    response = response.substring(
      outputIndex + "<output>".length,
      outputEndIndex > outputIndex ? outputEndIndex : response.length,
    );
  }
  answerDiv.innerHTML = "";
  if (response.includes("<tool_call>") && response.includes("</tool_call>")) {
    const answer1 = response.substring(0, response.indexOf("<tool_call>"));
    const functionCall = response.substring(
      response.indexOf("<tool_call>"),
      response.indexOf("</tool_call>") + "</tool_call>".length,
    );
    const answer2 = response.substring(
      response.indexOf("</tool_call>") + "</tool_call>".length,
    );

    if (answer1) {
      const answer1Div = document.createElement("div");
      answer1Div.innerHTML = markdownRenderer.makeHtml(answer1);
      answerDiv.appendChild(answer1Div);
    }
    addFunctionCallDialog(functionCall);
    if (answer2) {
      const answer2Div = document.createElement("div");
      answer2Div.innerHTML = markdownRenderer.makeHtml(answer1);
      answerDiv.appendChild(answer2Div);
    }
  } else {
    answerDiv.innerHTML = markdownRenderer.makeHtml(response);
  }
}

function addFunctionCallDialog(response) {
  const parser = new DOMParser();
  const functionCallString = parser
    .parseFromString(
      response.substring(
        response.indexOf("<tool_call>"),
        response.indexOf("</tool_call>") + "</tool_call>".length,
      ),
      "application/xml",
    )
    .querySelector("tool_call")?.textContent;
  console.log("functionCallString", functionCallString);
  if (!functionCallString) {
    return;
  }

  let functionCall;
  try {
    functionCall = JSON.parse(functionCallString);
  } catch {
    console.error("Error parsing function call", functionCallString);
    return;
  }

  if (!Object.keys(tool).includes(functionCall.name)) {
    console.error("Tool not found", functionCall.name);
    // Create and append error div
    const errorDiv = document.createElement("div");
    errorDiv.classList.add("error-message");
    errorDiv.textContent = `Error: Assistant tried to call a tool ${functionCall.name} that doesn't exist.`;
    answerDiv.appendChild(errorDiv);
    return;
  }

  const functionDiv = document.createElement("div");
  functionDiv.classList.add("function_call");

  const functionNameDiv = document.createElement("div");
  functionNameDiv.innerHTML = `MLC Assistant wants to perform an action:<br /><b>${tool[functionCall.name].displayName}</b>`;
  functionDiv.appendChild(functionNameDiv);

  const functionActionsDiv = document.createElement("div");
  functionActionsDiv.classList.add("function_actions");

  const continueButton = document.createElement("button");
  continueButton.classList.add("action-button");
  continueButton.id = "continueFunction";
  continueButton.textContent = "Continue";

  continueButton.addEventListener("click", async () => {
    disableSubmit();
    continueButton.classList.add("hidden");
    functionDiv.appendChild(createElement(LoaderCircle));
    try {
      const response = await callToolFunction(functionCall);
      if (typeof response === "object" && response["htmlLink"]) {
        await chrome.tabs.create({ url: response["htmlLink"] });
      } else if (
        response &&
        ((typeof response === "string" && response.length > 0) ||
          typeof response === "object")
      ) {
        messages = [
          ...messages,
          {
            role: "tool",
            content: `<tool_response>${JSON.stringify(response)}</tool_response>`,
            tool_call_id: "",
          },
        ];
        let curMessage = "";
        console.log("messages", messages);
        const completion = await engine.chat.completions.create({
          stream: true,
          messages,
        });

        for await (const chunk of completion) {
          const curDelta = chunk.choices[0].delta.content;
          if (curDelta) {
            curMessage += curDelta;
          }
          updateAnswer(curMessage);
        }

        const finalMessage = await engine.getMessage();
        messages = [...messages, { role: "assistant", content: finalMessage }];
        updateAnswer(finalMessage);
      }
    } finally {
      enableSubmit();
    }
  });

  functionActionsDiv.appendChild(continueButton);
  functionDiv.appendChild(functionActionsDiv);
  answerDiv.appendChild(functionDiv);
}

function updateInitProgressBar(percentage) {
  if (percentage < 0) percentage = 0;
  if (percentage > 1) percentage = 1;

  document.getElementById("progress-bar")!.style.width = percentage * 100 + "%";

  if (percentage >= 1) {
    document.getElementById("progress-bar-container")?.classList.add("hidden");
    document.getElementById("into")?.classList.remove("hidden");
    document.getElementById("input-container")?.classList.remove("hidden");

    enableSubmit();
    modalInput.focus();
  }
}

submitButton.addEventListener("click", () => {
  handleSubmit(false);
});
regenerateButton.addEventListener("click", () => {
  handleSubmit(true);
});
