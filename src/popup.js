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
  logger.info("query", query);

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
  replaceAnswer(finalMessage);
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

function updateAnswer(answer) {
  const answerDiv = document.getElementById("answer").lastElementChild;
  answerDiv.textContent = answer;
}

function replaceAnswer(answer) {
  const answerDiv = document.getElementById("answer").lastElementChild;
  if (answer.includes("<tool_call>") && answer.includes("</tool_call>")) {
    const parser = new DOMParser();
    const function_call = JSON.parse(
      parser
        .parseFromString(
          answer.substring(
            answer.indexOf("<tool_call>"),
            answer.indexOf("</tool_call>") + "</tool_call>".length,
          ),
          "application/xml",
        )
        .querySelector("tool_call").textContent,
    );
    console.log(answer);
    const function_name = function_call.name;
    const parameters = function_call.arguments || "";
    answerDiv.textContent = "";
    answerDiv.classList.add("function_call");
    answerDiv.innerHTML = `
    <div>Calling Function: <b>${function_name}</b></div>
    ${parameters ? `<div>Parameters: ${parameters}</div>` : ""}
    <div class="function_actions">
      <button class="action-button" id="continueFunction">
        Continue
      </button>
      <button class="action-button" id="abortFunction">Abort</button>
    </div>
    `;
  } else {
    answerDiv.textContent = answer;
  }
}

document.getElementById("submit").addEventListener("click", () => {
  handleSubmit(false);
});
document.getElementById("regenerateAction").addEventListener("click", () => {
  handleRegenerate();
});
