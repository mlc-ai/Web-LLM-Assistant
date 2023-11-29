import {ChatRestModule} from "@mlc-ai/web-llm";

// TODO: Surface this as an option to the user 
const useWebGPU = false;

var cm: ChatRestModule;
if (!useWebGPU) {
    cm = new ChatRestModule();
}

// Set reponse callback for chat module
const generateProgressCallback = (_step: number, message: string) => {
    // send the answer back to the content script
    console.log("background msg:", message);
    console.log("step:", _step);

    // Send message to content script
    const query = { active: true, currentWindow: true };
    chrome.tabs.query(query, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            message: message
        });
    });

    // Send message to popup script
    chrome.runtime.sendMessage({ answer: message });
};


chrome.runtime.onMessage.addListener(async function (request) {
    // Request is coming through modal
    if (request.source == "modal") {
        handleModal(request);
    } else if (request.source == "popup") {
        handlePopup(request);
    } else {
        console.log("Unidentified source");
    }
});

async function handleModal(request) {
    const inputText = request.input;
    const selectedText = request.selection;
    console.log("Input:", inputText);
    console.log("Selection:", selectedText);
    var input;
    if (selectedText.length > 0) {
        input = `${inputText}. ${selectedText}`;
    } else {
        input = inputText;
    }
    const query = { active: true, currentWindow: true };
    chrome.tabs.query(query, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            incomingMessage: true
        });
    });
    const response = await cm.generate(input, generateProgressCallback);
    console.log("Response:", response);
}

var context = "";
var selection = "";
async function handlePopup(request) {

    // check if the request contains a message that the user sent a new message
    if (request.input) {
        var inp = request.input;
        if (context.length > 0) {
            inp = `Use only the following context when answering the question at the end. Don't use any other knowledge.
            ${context}
            Question: ${request.input}
            Helpful Answer: `;
            // inp = "Use only the following context when answering the question at the end. Don't use any other knowledge.\n"+ context + "\n\nQuestion: " + request.input + "\n\nHelpful Answer: ";
        }
        console.log("Input:", inp);
        const response = await cm.generate(inp, generateProgressCallback);
    }

    if (request.context) {
        context = request.context;
        console.log("Got context:", context);
    }
    if (request.selection) {
        selection = request.selection;
        console.log("Got selection:", selection);
    }
}

chrome.commands.onCommand.addListener(function (command) {
    switch (command) {
        case 'showModal':
            showModal();
            break;
        default:
            console.log(`Command ${command} not found`);
    }
});

function showModal() {
    const query = { active: true, currentWindow: true };
    chrome.tabs.query(query, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            showModal: true
        });
    });
}