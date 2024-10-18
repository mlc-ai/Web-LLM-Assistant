import { getToolInfo, allTools } from "@mlc-ai/web-agent-interface";
import { ExtensionServiceWorkerMLCEngine } from "@mlc-ai/web-llm";
import { SYSTEM_PROMPT } from "./prompt";

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
  loadWebllmEngine();
});

const callToolFunction = async (functionCall) => {
  console.log("callToolFunction", functionCall);
  const { name: function_name, arguments: parameters = {} } = functionCall;
  const [tab] = await chrome.tabs.query({
    currentWindow: true,
    active: true,
  });
  return await chrome.tabs.sendMessage(tab.id, {
    action: "function_call",
    function_name,
    parameters,
  });
};

const MAX_MESSAGES = 8;
let messages = [{ role: "system", content: SYSTEM_PROMPT }];
let lastQuery = null;
let isGenerating = false;

async function loadWebllmEngine() {
  const selectedModel = "Hermes-3-Llama-3.1-8B-q4f32_1-MLC";
  await engine.reload(selectedModel);

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

function disableSubmit() {
  document.getElementById("submit").disabled = true;
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("submit").classList.add("hidden");
  document.getElementById("regenerate").classList.add("hidden");
  document.getElementById("regenerate").disabled = true;
}

function enableSubmit() {
  document.getElementById("submit").disabled = false;
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("submit").classList.remove("hidden");
  if (messages.length > 1) {
    document.getElementById("regenerate").classList.remove("hidden");
    document.getElementById("regenerate").disabled = false;
  }
}

async function handleSubmit(regenerate) {
  if (isGenerating) {
    return;
  }
  isGenerating = true;
  disableSubmit();

  if (
    (regenerate && !lastQuery) ||
    (!regenerate && !document.getElementById("modalInput").value)
  ) {
    enableSubmit();
    return;
  }
  let query;
  if (regenerate) {
    query = lastQuery;
    if (messages[messages.length - 1].role === "assistant") {
      messages.pop();
    }
  } else {
    const currentSelection = await callToolFunction({
      name: "getSelectedText",
    });
    let context = '';
    if (currentSelection) {
      console.log("currentSelection", currentSelection)
      context =
        "<Context Start>\n## User's current selected text:\n" +
        currentSelection +
        "<Context End>";
    }
    query = document.getElementById("modalInput").value;
    document.getElementById("modalInput").value = "";
    messages = [...messages, { role: "user", content: context + "\n\n" + query }];
    lastQuery = query;
  }

  while (messages.length > MAX_MESSAGES) {
    messages.splice(1, 2); // Remove the message at index 1 (second element)
  }

  const questionDiv = document.getElementById("question");
  questionDiv.classList.remove("hidden");
  questionDiv.textContent = "You: " + query;
  questionDiv.value = query;

  clearAnswer();
  let curMessage = "";
  console.log("messages", messages);
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
    updateAnswer(curMessage);
  }

  const finalMessage = await engine.getMessage();
  messages = [...messages, { role: "assistant", content: finalMessage }];
  updateAnswer(finalMessage);
  isGenerating = false;
  enableSubmit();
}

function clearAnswer() {
  const answerDiv = document.getElementById("answer");
  answerDiv.innerHTML = "";
}

function updateAnswer(response) {
  const answerDiv = document.getElementById("answer");
  answerDiv.classList.remove("hidden");
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
      answer1Div.textContent = answer1;
      answerDiv.appendChild(answer1Div);
    }
    addFunctionCallDialog(functionCall);
    if (answer2) {
      const answer2Div = document.createElement("div");
      answer2Div.textContent = answer2;
      answerDiv.appendChild(answer2Div);
    }
  } else {
    answerDiv.textContent = response;
  }
}

function addFunctionCallDialog(response) {
  const answerDiv = document.getElementById("answer");
  const parser = new DOMParser();
  const functionCallString = parser
    .parseFromString(
      response.substring(
        response.indexOf("<tool_call>"),
        response.indexOf("</tool_call>") + "</tool_call>".length,
      ),
      "application/xml",
    )
    .querySelector("tool_call").textContent;
  console.log("functionCallString", functionCallString);
  let functionCall;
  try {
    functionCall = JSON.parse(functionCallString);
  } catch {
    console.error("Error parsing function call", functionCallString);
    return;
  }

  if (!allTools.includes(functionCall.name)) {
    console.error("Tool not found", functionCall.name);
    // Create and append error div
    const errorDiv = document.createElement("div");
    errorDiv.classList.add("error-message");
    errorDiv.textContent = `Error: Assistant tried to call a tool ${functionCall.name} that doesn't exist.`;
    answerDiv.appendChild(errorDiv);
    return;
  }

  const parameters = functionCall.arguments || {};
  const functionDiv = document.createElement("div");
  functionDiv.classList.add("function_call");

  const functionNameDiv = document.createElement("div");
  functionNameDiv.innerHTML = `MLC Assistant wants to perform an action:<br /><b>${getToolInfo(functionCall.name)?.displayName}</b>`;
  functionDiv.appendChild(functionNameDiv);

  if (parameters && Object.keys(parameters).length > 0) {
    const parametersDiv = document.createElement("div");
    parametersDiv.textContent = `Parameters: ${JSON.stringify(parameters)}`;
    functionDiv.appendChild(parametersDiv);
  }

  const functionActionsDiv = document.createElement("div");
  functionActionsDiv.classList.add("function_actions");

  const continueButton = document.createElement("button");
  continueButton.classList.add("action-button");
  continueButton.id = "continueFunction";
  continueButton.textContent = "Continue";

  continueButton.addEventListener("click", async () => {
    disableSubmit();
    try {
      const response = await callToolFunction(functionCall);
      if (response && response.length > 0) {
        messages = [
          ...messages,
          {
            role: "tool",
            content: `<tool_response>${response}</tool_response>`,
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

  document.getElementById("progress-bar").style.width = percentage * 100 + "%";

  if (percentage >= 1) {
    document.getElementById("progress-bar-container").classList.add("hidden");
  }
}

document.getElementById("submit").addEventListener("click", () => {
  handleSubmit(false);
});
document.getElementById("regenerate").addEventListener("click", () => {
  handleSubmit(true);
});
