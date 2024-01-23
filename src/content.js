var selectedText = "";
var modalVisible = false;
var lastInlineNode = null;
var inlineAnswerNodes = Array();

var inlineMode;
chrome.storage.sync.get(
    { inlineMode: false },
    (items) => {
        inlineMode = items.inlineMode;
        console.log("Inline mode set to", inlineMode);
    }
);


function hideModalIfVisible() {
    if (modalVisible) {
        const modalWrapperDivs = document.getElementsByClassName("modalWrapper");
        modalWrapperDivs[0].remove();
        modalVisible = false;
    }
}

function handleSubmit() {
    const input = document.getElementById("modalInput");

    if (inlineMode) {
        lastInlineNode = selectInlineNode();
        const beginNode = document.createElement("div");
        beginNode.className = "cm-line";
        beginNode.innerHTML = "% Begin AI Generated Content:"
        lastInlineNode.insertAdjacentElement("afterend", beginNode);
        lastInlineNode = beginNode;

        const firstNode = document.createElement("div");
        firstNode.className = "cm-line";
        lastInlineNode.insertAdjacentElement("afterend", firstNode);
        lastInlineNode = firstNode;
        inlineAnswerNodes = [firstNode];
    } else {
        // Show the action bar 
        const actionsDiv = document.getElementById("actions")
        actionsDiv.style.display = "flex";
        //show the question
        const questionDiv = document.getElementById("question")
        questionDiv.style.display = "flex"
        questionDiv.textContent = "You: "+input.value
        questionDiv.value = input.value
        //adjust height to include question and action bar
        const modalWrapperDiv = document.getElementById("modalWrapper");
        modalWrapperDiv.style.height = "auto";
    }

    //reset feedback buttons
    thumbsUp = document.getElementById("thumbsUpButtonImg")
    thumbsUp.src = chrome.runtime.getURL("icons/thumbs-up-lined.png");
    thumbsDown = document.getElementById("thumbsDownButtonImg")
    thumbsDown.src = chrome.runtime.getURL("icons/thumbs-down-lined.png");


    chrome.runtime.sendMessage({
        input: input.value,
        selection: selectedText,
        source: "modal"
    });

    if (inlineMode) {
        hideModalIfVisible();
    }
}

document.addEventListener("keydown", function(event) {
    const key = event.key;
    if (key === "Escape") {
        hideModalIfVisible();
    }
    if (modalVisible) {
        const input = document.getElementById("modalInput");
        if (key == "Enter" && input === document.activeElement) {
            handleSubmit();
        }
    }
});

function createModalWrapper(contentDiv, boundingRect, topMargin, leftRightMargin) {

    var modalWrapperDiv =  document.createElement("div");
    modalWrapperDiv.className = "modalWrapper";
    modalWrapperDiv.id = "modalWrapper";
    modalWrapperDiv.style.top = boundingRect.bottom + topMargin + "px";
    modalWrapperDiv.style.left = boundingRect.left + leftRightMargin + "px";
    modalWrapperDiv.style.width = contentDiv.offsetWidth - 2*leftRightMargin + "px";
    modalWrapperDiv.style.height = "40px";
    modalWrapperDiv.style.display = "flex";
    modalWrapperDiv.style.position = "absolute";
    modalWrapperDiv.style.flexDirection = "column";
    return modalWrapperDiv
}

function saveFeedback(good){
    //Determine what data should be written
    let question = document.getElementById("question").value
    let answer = document.getElementById("answer").textContent
    const data = 'Question: '+ question + '\n Answer: '+ answer + '\n\n'

    //Get the file
    let fileTemp = 'BadResponse.txt'
    if (good){
        //write to good answer file
        fileTemp = 'GoodResponse.txt'
    }
    const file = fileTemp

    //Append the data (Creates file if it does not exist)
    const fs = require('browserify-fs');

    // Append data to a file
    fs.appendFile(file, data, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log('Data appended successfully!');
    }
    });
    let feedbackText = prompt("Do you have further feedback?");
    console.log("The following feedback has been recieved: ", feedbackText);
}

function createFeedbackButtons(){
    //make thumbs up button
    var thumbsUp = document.createElement('button')
    // thumbsUp.textContent = "Good Answer";
    thumbsUp.style.fontSize = "10px";
    thumbsUp.style.backgroundColor = "transparent";
    thumbsUp.style.border = "none";
    thumbsUp.style.marginRight = "5px";
    thumbsUp.style.color = "rgba(255, 255, 255, 0.6)";
    //make button a lined thumbs up image
    var ThumbsUpImg = new Image(15, 15);
    ThumbsUpImg.id = "thumbsUpButtonImg"
    ThumbsUpImg.src = chrome.runtime.getURL("icons/thumbs-up-lined.png");
    thumbsUp.append(ThumbsUpImg)

    //make thumbs down button
    var thumbsDown = document.createElement('button')
    // thumbsDown.textContent = "Bad Answer";
    thumbsDown.style.fontSize = "10px";
    thumbsDown.style.backgroundColor = "transparent";
    thumbsDown.style.border = "none";
    thumbsDown.style.marginRight = "5px";
    thumbsDown.style.color = "rgba(255, 255, 255, 0.6)";
    //make button a lined thumbs down image
    var ThumbsDownImg = new Image(15, 15);
    ThumbsDownImg.id = "thumbsDownButtonImg"
    ThumbsDownImg.src = chrome.runtime.getURL("icons/thumbs-down-lined.png");
    thumbsDown.append(ThumbsDownImg)

    //add clicking features
    thumbsUp.addEventListener("click", () => {
        console.log("Saving as good answer")
        //update image
        ThumbsUpImg.src = chrome.runtime.getURL("icons/thumbs-up-filled.png");
        ThumbsDownImg.src = chrome.runtime.getURL("icons/thumbs-down-lined.png");
        saveFeedback(true)
    });

    thumbsDown.addEventListener("click", () => {
        console.log("Saving as bad answer")
        //update image
        ThumbsUpImg.src = chrome.runtime.getURL("icons/thumbs-up-lined.png");
        ThumbsDownImg.src = chrome.runtime.getURL("icons/thumbs-down-filled.png");
        saveFeedback(false)
    });

   return [thumbsUp, thumbsDown]
}

function createActionBar(contentDiv, leftRightMargin) {
    var actionsDiv = document.createElement("div");
    actionsDiv.className = "actions";
    actionsDiv.id = "actions";
    actionsDiv.style.width = contentDiv.offsetWidth - 2*leftRightMargin + "px";
    actionsDiv.style.height = "20px";
    actionsDiv.style.display = "none";
    actionsDiv.style.flexDirection = "row-reverse";

    var replaceAction = document.createElement('button');
    replaceAction.textContent = "replace";
    replaceAction.style.fontSize = "10px";
    replaceAction.style.backgroundColor = "transparent";
    replaceAction.style.border = "none";
    replaceAction.style.marginRight = "10px";
    replaceAction.style.color = "rgba(255, 255, 255, 0.6)";

    replaceAction.addEventListener("click", () => {
        // Get output text
        const outputText = document.getElementById("answer").innerHTML;
        replaceSelectedText(outputText)
    });

    actionsDiv.appendChild(replaceAction);
    //Create feedback buttons
    const [thumbsUp, thumbsDown] = createFeedbackButtons()
    actionsDiv.appendChild(thumbsDown);
    actionsDiv.appendChild(thumbsUp);

    return actionsDiv;
}

function createInputModal(contentDiv, modalWrapperDiv, leftRightMargin) {

    // Create and add modal to modal wrapper
    var modalDiv = document.createElement("div");
    modalDiv.className = "modal";
    modalDiv.style.height = "40px";
    modalDiv.style.width = contentDiv.offsetWidth - 2*leftRightMargin  + "px";
    modalDiv.style.display = "flex";
    modalDiv.style.position = "relative";

    // Create and add modal to modal wrapper
    var modalDiv = document.createElement("div");
    modalDiv.className = "modal";
    modalDiv.style.height = "40px";
    modalDiv.style.width = contentDiv.offsetWidth - 2*leftRightMargin  + "px";
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
    const icon = document.createElement('img');
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
    input.id = "modalInput"
    inputDiv.appendChild(input);

    modalDiv.appendChild(iconDiv);
    modalDiv.appendChild(inputDiv);

    return modalDiv;
}

function createQuestionModal(contentDiv, leftRightMargin) {
    var questionDiv = document.createElement("div");
    questionDiv.className = "question";
    questionDiv.id = "question";
    questionDiv.placeholder = "This is the question."

    questionDiv.style.width = contentDiv.offsetWidth - 2*leftRightMargin + "px";
    questionDiv.style.height = "auto";
    questionDiv.style.display = "none";
    questionDiv.textContent = ""
    questionDiv.style.padding = "5px";
    return questionDiv;
}

function createAnswerModal(contentDiv, leftRightMargin) {
    var answerDiv = document.createElement("div");
    answerDiv.className = "answer";
    answerDiv.id = "answer";
    answerDiv.style.width = contentDiv.offsetWidth - 2*leftRightMargin + "px";
    return answerDiv;
}

function showModal() {

    // Params
    const leftRightMargin = 15;
    const topMargin = 5;

    hideModalIfVisible();

    const selection = window.getSelection();
    var boundingRect;
    if (selection.type == "Range") {
        // Selected a bunch of text, show below selection
        boundingRect = selection.getRangeAt(0).getBoundingClientRect();
        selectedText = window.getSelection().toString();
        console.log("Selected text:", selectedText);
    } else {
        // No selection, show below active line
        const activeLine = document.getElementsByClassName("cm-activeLine")[0];
        boundingRect = activeLine.getBoundingClientRect();
        console.log("No text selection");
        console.log(window.getSelection());
    }
    console.log("bounds", boundingRect);

    const contentDiv = document.getElementsByClassName("cm-content")[0];
    
    // Create and add modal wrapper to DOM
    const modalWrapperDiv = createModalWrapper(contentDiv, boundingRect, topMargin, leftRightMargin)
    document.body.appendChild(modalWrapperDiv);

    // Create question modal to display request
    const questionDiv = createQuestionModal(contentDiv, leftRightMargin)
    modalWrapperDiv.appendChild(questionDiv)

    // Create answer
    const answerDiv = createAnswerModal(contentDiv, leftRightMargin);
    modalWrapperDiv.appendChild(answerDiv);

    // Create action bar
    const actionsDiv = createActionBar(contentDiv, leftRightMargin); 
    modalWrapperDiv.appendChild(actionsDiv);

    // Create input
    const inputModal = createInputModal(contentDiv, modalWrapperDiv, leftRightMargin);
    modalWrapperDiv.appendChild(inputModal);

    // Make the input the focus
    document.getElementById("modalInput").focus()

    modalVisible = true;
}

function replaceSelectedText(newText) {
    const nodes = Array.from(document.getElementsByClassName("cm-line")).filter( el => {
        const cleanText = el.innerHTML.replace(/<\/?[^>]+(>|$)/g, "");
        if (cleanText.length > 0) {
            if (selectedText.includes(cleanText)) {
                return true;
            }
        }
        return false;
    });
    // Replace content of first node with new text, and remove all subsequent nodes
    if (nodes.length > 0) {
        nodes[0].innerHTML = newText;
        if (nodes.length > 1) {
            nodes.slice(1).forEach( node => {
                node.remove();
            });
        }
    }
}

function selectInlineNode() {
    // Find node below selected text
    const contentNodes = Array.from(document.getElementsByClassName("cm-content")[0].childNodes)
    const lastNodeIdx = contentNodes.flatMap( (el, idx) => {
        if (el.className != "cm-line") {
            return null;
        }
        const cleanText = el.innerHTML.replace(/<\/?[^>]+(>|$)/g, "");
        if (cleanText.length > 0) {
            if (selectedText.includes(cleanText) || cleanText.includes(selectedText)) {
                return idx;
            }
        }
        return null;
    }).filter(x=>x).pop();
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

    if (request.showModal) {
        showModal();
    }

    if (request.incomingMessage) {
        console.log("INCOMING MESSAGE");
    }

    if (request.message) {
        console.log("content got message", request.message);
        updateAnswer(request.message);
    }

    return true;
});