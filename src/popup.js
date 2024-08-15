import { GoogleDocPage, OverleafPage } from "@mlc-ai/web-agent-interface";
import { ExtensionServiceWorkerMLCEngine } from "@mlc-ai/web-llm";

const overleaf = new OverleafPage();
const gdocs = new GoogleDocPage();

let selectedText = "";
let inlineMode;
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
  const completion = await engine.chat.completions.create({
    stream: true,
    messages: [
      {
        role: "system",
        content: `Answer user's question or execute user's instruction,\n\nContext:\nThe user currently selected the following text:\n${selectedText}\n\n`,
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

  if (inlineMode) {
    hideModalIfVisible();
  }
}

function updateAnswer(answer) {
  const answerDiv = document.getElementById("answer");
  answerDiv.textContent = answer;
  answerDiv.classList.remove("hidden");

  const modalInput = document.getElementById("modalInput");
  modalInput.value = "";
}

document.addEventListener("keydown", function (event) {
  const key = event.key;
  const input = document.getElementById("modalInput");
  if (key == "Enter" && input === document.activeElement) {
    handleSubmit(false);
  }
});
document
  .querySelector(".input-container .submit")
  .addEventListener("click", () => {
    handleSubmit(false);
  });
