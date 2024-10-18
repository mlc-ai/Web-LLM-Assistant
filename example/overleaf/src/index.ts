import * as webllm from "@mlc-ai/web-llm";

// Common helper methods
function setLabel(id: string, text: string) {
  const label = document.getElementById(id)!;
  label.innerText = text;
}

function setLabelWithMessages(
  id: string,
  messages: webllm.ChatCompletionMessageParam[],
) {
  const label = document.getElementById(id)!;
  label.innerText = messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role}:\n${m.content}`)
    .join("\n\n\n");
}

const initProgressCallback = (report: webllm.InitProgressReport) => {
  setLabel("init-label", report.text);
};

async function overleafSummaryExample() {
  const system_prompt = `You are a helpful assistant running in the user's browser.
You need to answer questions or handle tasks by calling the available functions provided within <tools></tools> XML tags.
You must use these functions to assist with the user's query.

Here are the list of available tools:
<tools>
[{
  "type": "function",
  "function": {
    "name": "getSelectedText",
    "description": "getSelectedText() -> str - Get the user's current selected text content on the document, no parameter is needed.\\n\\n Returns:\\n    str: The user's current selected text content on the document.",
    "parameters": { "type": "object", "properties": {}, "required": [] }
  }
},
{
  "type": "function",
  "function": {
    "name": "replaceSelectedText",
    "description": "Replaces the user's current selected text in the document with new text content.",
    "parameters": {
      "type": "object",
      "properties": {
        "newText": { "type": "string" }
      },
      "required": ["newText"]
    }
  }
},
{
  "type": "function",
  "function": {
    "name": "appendTextToDocument",
    "description": "Appends text content to the end of the document.",
    "parameters": {
      "type": "object",
      "properties": {
        "text": { "type": "string" }
      },
      "required": ["text"]
    }
  }
}]
</tools>

Use the following pydantic model JSON schema for each tool call you make:

{
  "properties": {
    "arguments": { "title": "Arguments", "type": "object" },
    "name": { "title": "Name", "type": "string" }
  },
  "required": ["arguments", "name"],
  "title": "FunctionCall",
  "type": "object"
}

For each function call, return a JSON object with the function name and arguments within <tool_call></tool_call> XML tags as follows:

<tool_call>
{"arguments": <args-dict>, "name": "<function-name>"}
</tool_call>

For example, to call the function \`appendTextToDocument\`, you need to reply:

<tool_call>
{"arguments": {"text": "Some text to be appended."}, "name": "appendTextToDocument"}
</tool_call>

**Guidelines:**

- **Always** generate a valid JSON string within <tool_call></tool_call> XML tags.
- If you are calling a function, **only** generate the <tool_call> block and **nothing else** in your response. **Stop generating** after completing the <tool_call> XML tags.
- Function calls **must** follow the specified format and use both <tool_call> and </tool_call>.
- Required parameters **must** be specified.
- **Only** provide parameters specified in the function description and **no additional ones**.
- **Only** call **one function at a time**.
- When calling a function, **do not include any other words** in your response. **Only** output the <tool_call> block.`;

  const selectedModel = "Hermes-3-Llama-3.1-8B-q4f32_1-MLC";
  const engine: webllm.MLCEngineInterface = await webllm.CreateMLCEngine(
    selectedModel,
    { initProgressCallback, logLevel: "INFO" },
  );

  // 1. First request, expect to generate tool call
  const messages: webllm.ChatCompletionMessageParam[] = [
    { role: "system", content: system_prompt },
    {
      role: "user",
      content: "Summarize this paragraph for me.",
    },
    {
      role: "assistant",
      content: `<tool_call>
{"arguments": {}, "name": "getSelectedText"}
</tool_call>`,
    },
    {
      role: "tool",
      content: `<tool_response>The currently selected text on the page is:\n\n
\\section{Introduction}
\\noindent In recent years, the development of language models, particularly Generative Pretrained Transformers (GPT) and Large Language Models (LLMs), has revolutionized how computers understand and generate language. At their core, language models predict the likelihood of the next word in a sequence based on the words that come before it, mathematically represented as \( P(Y_1 \mid Y_{1:t-1}) \). These models are built on foundational elements like encoders and decoders, often within a transformer architecture. Transforming basic models through training on large datasets and fine-tuning, LLMs gain millions of parameters for human-like text generation.\\

\\noindent For our assignment, we've been given the task of building our own LLM. Starting with the foundational principles of NanoGPT, we plan to expand and adapt these concepts to construct a versatile model capable of performing a broad range of tasks. These tasks include summarizing texts, answering questions, gauging sentiment in writings, and identifying specific names and terms.\\

\\noindent Our report will cover several important parts of our assignment. First, we'll talk about how we got and prepared our data. Then, we'll describe the model architecture itself, including how we decided to build it and why. After that, we'll share how we actually built and trained our model, including the pretraining and fine-tuning phase. Finally, we'll wrap up with our conclusions, looking at how well our model performed on the tasks we gave it and what we learned from the whole process.\\
</tool_response>`,
      tool_call_id: "",
    },
  ];

  setLabelWithMessages("generate-label", messages);

  const request1: webllm.ChatCompletionRequestNonStreaming = {
    stream: false,
    messages: messages,
    seed: 0,
  };
  const reply1 = await engine.chat.completions.create(request1);
  const response1 = reply1.choices[0].message.content;
  console.log(reply1.usage);
  console.log("Response 1: " + response1);

  setLabelWithMessages("generate-label", messages);

  messages.push({ role: "assistant", content: response1 });
  messages.push({
    role: "user",
    content: "Replace the paragraph with a shorter and more consise version.",
  });

  setLabelWithMessages("generate-label", messages);

  const request2: webllm.ChatCompletionRequestNonStreaming = {
    stream: false,
    messages: messages,
    seed: 0,
  };
  const reply2 = await engine.chat.completions.create(request2);
  const response2 = reply2.choices[0].message.content;
  messages.push({ role: "assistant", content: response2 });
  console.log(reply2.usage);
  console.log("Response 2: " + response2);

  setLabelWithMessages("generate-label", messages);
}

overleafSummaryExample();
