import { GoogleDocPage, OverleafPage } from "@mlc-ai/web-agent-interface";
import { ExtensionServiceWorkerMLCEngine } from "@mlc-ai/web-llm";
import { SYSTEM_PROMPT } from "./prompt";

const overleaf = new OverleafPage();
const gdocs = new GoogleDocPage();

let selectedText = "";
let customization;

const logger = {
  info: (...args) => {
    console.log("[MLC-Assistant]", ...args);
  },
  warn: (...args) => {
    console.warn("[MLC-Assistant]", ...args);
  },
  error: (...args) => {
    console.error("[MLC-Assistant]", ...args);
  },
};

//retrieve browser settings and determine customization
chrome.storage.sync.get({ customization: 0 }, (items) => {
  customization = items.customization;
  logger.info("Customization set to ", customization);
});
const engine = new ExtensionServiceWorkerMLCEngine({
  initProgressCallback: (progress) => logger.info(progress.text),
});
window.addEventListener("load", () => {
  loadWebllmEngine();
});

async function loadWebllmEngine() {
  await engine.reload("Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC");

  logger.info("Engine loaded.");
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("submit").classList.remove("hidden");
  document.addEventListener("keydown", function (event) {
    const key = event.key;
    const input = document.getElementById("modalInput");
    if (key == "Enter" && input === document.activeElement) {
      handleSubmit(false);
    }
  });
  document.getElementById("submit").disabled = false;
}

async function handleSubmit(regen) {
  // Input depends on whether the question is new or is being regenerated
  let inputTemp = document.getElementById("modalInput");

  // If question is regenerating, get question
  if (regen) {
    // change inputTemp to the question
    inputTemp = document.getElementById("question");
    logger.info("regen input", inputTemp.value);
  }

  const input = inputTemp;

  // Show the action bar
  const actionsDiv = document.getElementById("actions");
  actionsDiv.classList.remove("hidden");
  //show the question
  const questionDiv = document.getElementById("question");
  questionDiv.classList.remove("hidden");
  questionDiv.textContent = "You: " + input.value;
  questionDiv.value = input.value;

  //adjust the query depending on the prompt customization
  let query = "";
  if (customization == 1) {
    query += "Respond creatively to the following: ";
  } else if (customization == 2) {
    query += "Respond with precision to the following: ";
  }

  query += input.value;
  logger.info(query);

  let curMessage = "";
  createAnswerEntry();
  const completion = await engine.chat.completions.create({
    stream: true,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      { role: "user", content: query },
    ],
  });

  for await (const chunk of completion) {
    const curDelta = chunk.choices[0].delta.content;
    if (curDelta) {
      curMessage += curDelta;
    }
    updateAnswer(curMessage);
  }

  const finalMessage = await engine.getMessage();
  updateAnswer(finalMessage);
}

function createAnswerEntry() {
  const answerDiv = document.getElementById("answer");
  answerDiv.classList.remove("hidden");
  const answerEntry = document.createElement("div");
  answerEntry.classList.add("answer-item");
  answerDiv.appendChild(answerEntry);

  const modalInput = document.getElementById("modalInput");
  modalInput.value = "";
}

function updateAnswer(response) {
  const answerDiv = document.getElementById("answer");
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
  const functionCall = JSON.parse(
    parser
      .parseFromString(
        response.substring(
          response.indexOf("<tool_call>"),
          response.indexOf("</tool_call>") + "</tool_call>".length,
        ),
        "application/xml",
      )
      .querySelector("tool_call").textContent,
  );
  const function_name = functionCall.name;
  const parameters = functionCall.arguments || "";
  const functionDiv = document.createElement("div");
  functionDiv.classList.add("function_call");

  const functionNameDiv = document.createElement("div");
  functionNameDiv.innerHTML = `MLC Assistant wants to call function:<br /><b>${function_name}</b>`;
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
    const [tab] = await chrome.tabs.query({
      currentWindow: true,
      active: true,
    });
    console.log("tab", tab);
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "function_call",
      function_name,
      parameters,
    });
    console.log("response", response);
  });

  functionActionsDiv.appendChild(continueButton);
  functionDiv.appendChild(functionActionsDiv);
  answerDiv.appendChild(functionDiv);
}

document.getElementById("submit").addEventListener("click", () => {
  handleSubmit(false);
});
document.getElementById("regenerateAction").addEventListener("click", () => {
  handleRegenerate();
});
