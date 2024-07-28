import * as hosts from "./hosts.js";
import { ExtensionServiceWorkerMLCEngine } from "@mlc-ai/web-llm";

let selectedText = "";
let modalVisible = false;
let lastInlineNode = null;
let inlineAnswerNodes = Array();
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

//retrieve browser settings and determine inline mode
chrome.storage.sync.get({ inlineMode: false }, (items) => {
  inlineMode = items.inlineMode;
  logger.info("Inline mode set to", inlineMode);
});

//retrieve browser settings and determine customization
chrome.storage.sync.get({ customization: 0 }, (items) => {
  customization = items.customization;
  logger.info("Customization set to ", customization);
});

const engine = new ExtensionServiceWorkerMLCEngine({
  initProgressCallback: (progress) => logger.info(progress.text),
});
loadWebllmEngine();

async function loadWebllmEngine() {
  await engine.reload("Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC");
  logger.info("Engine loaded.");
}

function hideModalIfVisible() {
  if (modalVisible) {
    const modalWrapperDivs = document.getElementsByClassName("modalWrapper");
    modalWrapperDivs[0].remove();
    modalVisible = false;
  }
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

  if (inlineMode) {
    lastInlineNode = selectInlineNode();
    const beginNode = document.createElement("div");
    beginNode.className = "cm-line";
    beginNode.innerHTML = "% Begin AI Generated Content:";
    lastInlineNode.insertAdjacentElement("afterend", beginNode);
    lastInlineNode = beginNode;

    const firstNode = document.createElement("div");
    firstNode.className = "cm-line";
    lastInlineNode.insertAdjacentElement("afterend", firstNode);
    lastInlineNode = firstNode;
    inlineAnswerNodes = [firstNode];
  } else {
    // Show the action bar
    const actionsDiv = document.getElementById("actions");
    actionsDiv.style.display = "flex";
    //show the question
    const questionDiv = document.getElementById("question");
    questionDiv.style.display = "flex";
    questionDiv.textContent = "You: " + input.value;
    questionDiv.value = input.value;

    //adjust height to include question and action bar
    const modalWrapperDiv = document.getElementById("modalWrapper");
    modalWrapperDiv.style.height = "auto";
  }

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

document.addEventListener("keydown", function (event) {
  const key = event.key;
  if (key === "Escape") {
    hideModalIfVisible();
  }
  if (modalVisible) {
    const input = document.getElementById("modalInput");
    if (key == "Enter" && input === document.activeElement) {
      handleSubmit(false);
    }
  }
});

function createModalWrapper(
  contentDiv,
  boundingRect,
  topMargin,
  leftRightMargin,
) {
  let modalWrapperDiv = document.createElement("div");
  modalWrapperDiv.className = "modalWrapper";
  modalWrapperDiv.id = "modalWrapper";
  modalWrapperDiv.style.top = boundingRect.bottom + topMargin + "px";
  modalWrapperDiv.style.left = boundingRect.left + leftRightMargin + "px";
  modalWrapperDiv.style.width =
    contentDiv.offsetWidth - 2 * leftRightMargin + "px";
  modalWrapperDiv.style.height = "45px";
  modalWrapperDiv.style.position = "absolute";
  return modalWrapperDiv;
}

function createActionBar(contentDiv, leftRightMargin) {
  let actionsDiv = document.createElement("div");
  actionsDiv.className = "actions";
  actionsDiv.id = "actions";
  actionsDiv.style.height = "20px";
  actionsDiv.style.display = "none";
  actionsDiv.style.flexDirection = "row-reverse";

  // Create replace button
  let replaceAction = document.createElement("button");
  replaceAction.textContent = "Replace";
  replaceAction.style.fontSize = "10px";
  replaceAction.style.backgroundColor = "transparent";
  replaceAction.style.border = "none";
  replaceAction.style.marginRight = "10px";
  replaceAction.style.color = "rgba(255, 255, 255, 0.6)";
  replaceAction.addEventListener("click", () => {
    // Get output text
    const outputText = document.getElementById("answer").textContent;
    replaceSelectedText(outputText);
  });
  actionsDiv.appendChild(replaceAction);

  //Create regenerate answer button
  let regenerate = document.createElement("button");
  regenerate.style.fontSize = "10px";
  regenerate.style.backgroundColor = "transparent";
  regenerate.style.border = "none";
  regenerate.style.marginRight = "5px";
  regenerate.style.color = "rgba(255, 255, 255, 0.6)";
  //Create image for regenerate button
  let regenerateImg = new Image(15, 15);
  regenerateImg.src = chrome.runtime.getURL("icons/redo.png");
  regenerate.append(regenerateImg);

  regenerate.addEventListener("click", () => {
    handleSubmit(true);
  });
  actionsDiv.appendChild(regenerate);

  return actionsDiv;
}

function createInputModal(contentDiv, modalWrapperDiv, leftRightMargin) {
  // Create and add modal to modal wrapper
  let modalDiv = document.createElement("div");
  modalDiv.className = "modal";
  modalDiv.style.height = "40px";
  modalDiv.style.width = contentDiv.offsetWidth - 2 * leftRightMargin + "px";
  modalDiv.style.display = "flex";
  modalDiv.style.position = "relative";
  modalWrapperDiv.appendChild(modalDiv);

  // Add elements to modal
  const iconDiv = document.createElement("div");
  iconDiv.style.width = "32px";
  iconDiv.style.height = "32px";
  iconDiv.style.display = "flex";
  iconDiv.style.alignItems = "center";
  iconDiv.style.justifyContent = "center";
  iconDiv.style.marginLeft = "3px";

  const icon = document.createElement("img");
  icon.style.height = "20px";
  icon.style.width = "20px";
  icon.src = chrome.runtime.getURL("icons/wand-64.png");
  iconDiv.appendChild(icon);

  const inputDiv = document.createElement("div");
  inputDiv.style.flexGrow = 1;
  inputDiv.style.height = "32px";
  inputDiv.display = "flex";
  inputDiv.alignItems = "center";

  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "How can I help?";
  input.className = "modalInput";
  input.id = "modalInput";
  inputDiv.appendChild(input);

  modalDiv.appendChild(iconDiv);
  modalDiv.appendChild(inputDiv);

  return modalDiv;
}

function createAnswerModal(contentDiv, leftRightMargin) {
  let answerDiv = document.createElement("div");
  answerDiv.className = "answer";
  answerDiv.id = "answer";
  return answerDiv;
}

function createQuestionModal(contentDiv, leftRightMargin) {
  let questionDiv = document.createElement("div");
  questionDiv.className = "question";
  questionDiv.id = "question";
  questionDiv.placeholder = "This is the question.";

  questionDiv.style.height = "auto";
  questionDiv.style.display = "none";
  questionDiv.textContent = "";
  questionDiv.style.padding = "5px";
  return questionDiv;
}

function showModal() {
  // Params
  let leftRightMargin = 15;
  let tempContentDiv;
  const topMargin = 5;
  hideModalIfVisible();

  const selection = window.getSelection();
  logger.info("selection is ", selection);
  let boundingRect;
  if (selection.type === "Range" || selection.type === "Caret") {
    // Selected a bunch of text, show below selection
    boundingRect = selection.getRangeAt(0).getBoundingClientRect();
    selectedText = window.getSelection().toString();
    logger.info("Selected text:", selectedText);
    tempContentDiv = document.getElementsByClassName("cm-content")[0];
  } else {
    // No selection, show below active line
    // docs-material companion-enabled for docs
    logger.info("No text selection");
    host = hosts.findHost();
    // logger.info(host)
    boundingRect = host.boundingRect.getBoundingClientRect();
    leftRightMargin = host.leftRightMargin;
    tempContentDiv = host.tempContentDiv;
  }

  logger.info("bounds", boundingRect);
  const contentDiv = tempContentDiv;

  // Create and add modal wrapper to DOM
  const modalWrapperDiv = createModalWrapper(
    contentDiv,
    boundingRect,
    topMargin,
    leftRightMargin,
  );
  document.body.appendChild(modalWrapperDiv);

  // Create question modal to display request
  const questionDiv = createQuestionModal(contentDiv, leftRightMargin);
  modalWrapperDiv.appendChild(questionDiv);
  // Create answer
  const answerDiv = createAnswerModal(contentDiv, leftRightMargin);
  modalWrapperDiv.appendChild(answerDiv);

  // Create action bar
  const actionsDiv = createActionBar(contentDiv, leftRightMargin);
  modalWrapperDiv.appendChild(actionsDiv);

  // Create input
  const inputModal = createInputModal(
    contentDiv,
    modalWrapperDiv,
    leftRightMargin,
  );
  modalWrapperDiv.appendChild(inputModal);

  // Make the input the focus
  document.getElementById("modalInput").focus();

  modalVisible = true;
}

function replaceSelectedText(replacementText) {
  // Overleaf
  Array.from(document.getElementsByClassName("cm-line")).forEach((el) => {
    if (el.textContent.includes(selectedText)) {
      el.textContent = el.textContent.replace(selectedText, replacementText);
    }
  });
}

function selectInlineNode() {
  // Find node below selected text
  const contentNodes = Array.from(
    document.getElementsByClassName("cm-content")[0].childNodes,
  );
  const lastNodeIdx = contentNodes
    .flatMap((el, idx) => {
      if (el.className != "cm-line") {
        return null;
      }
      const cleanText = el.innerHTML.replace(/<\/?[^>]+(>|$)/g, "");
      if (cleanText.length > 0) {
        if (
          selectedText.includes(cleanText) ||
          cleanText.includes(selectedText)
        ) {
          return idx;
        }
      }
      return null;
    })
    .filter((x) => x)
    .pop();
  return contentNodes[lastNodeIdx];
}

function updateAnswer(answer) {
  if (inlineMode) {
    if (answer.split(/\r?\n/).length > inlineAnswerNodes.length) {
      const nextNode = document.createElement("div");
      nextNode.className = "cm-line";
      lastInlineNode.insertAdjacentElement("afterend", nextNode);
      lastInlineNode = nextNode;
      inlineAnswerNodes.push(nextNode);
      lastInlineNode.scrollIntoView();
    }
    answer.split(/\r?\n/).forEach(function (value, i) {
      inlineAnswerNodes[i].innerHTML = value;
    });
  } else {
    const answerDiv = document.getElementById("answer");
    answerDiv.textContent = answer;
    answerDiv.style.padding = "5px";
    answerDiv.style.height = "auto";
    answerDiv.scrollTop = answerDiv.scrollHeight;

    answerDiv.parentNode.style.height = "auto";

    const modalInput = document.getElementById("modalInput");
    modalInput.value = "";
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.info(request);

  if (request.showModal) {
    logger.info("Showing model");
    showModal();
  }

  return true;
});
