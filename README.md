<img width="865" alt="image" src="https://github.com/mlc-ai/mlc-assistant/assets/11940172/2d38b8e1-21e8-44b1-b772-83e72a22d638">

Chat with your documents and improve your writing using large-language models in your browser. We currently support using the MLC Assistant in Google Chrome with [Overleaf](https://www.overleaf.com/), and plan on adding support for other platforms and browsers soon.

![demo](https://github.com/mlc-ai/mlc-assistant/assets/11940172/51f0668d-860e-4014-b104-4d2e0e7b334e)

## Getting Started

### 1. Install Git LFS

Follow the instructions [here](https://git-lfs.com) to install Git LFS.

### 2. Create Conda environment (optional)

```bash
conda create --name mlc_assistant python=3.10
conda activate mlc_assistant
```

### 3. Run the startup script

This will start the server which runs the model locally, so that the Chrome extension can communicate with it.

```bash
./startup.sh
```

### 4. Install the Chrome extension <a id='step6'></a>

Launch Google Chrome and navigate to the extensions page by entering `chrome://extensions`. Enable Developer Mode by clicking the toggle switch next to Developer mode. Click the Load unpacked button and select the `mlc-assistant/dist` directory.

<img src="https://github.com/mlc-ai/mlc-assistant/assets/11940172/cdb18fb3-24c5-41bf-9a40-484692c2150a" width="300">

## Architecture

The MLC Assistant has the following architecture:

![MLC Assistant Architecture](https://github.com/user-attachments/assets/2cc7803f-aeca-45c8-a8d7-70384926ddb3)

## Development

If you'd like to contribute to development, or customize this implementation further, you can follow these steps.

### Setting up MLC LLM

Follow the steps below (only for CPU on macOS, Windows, or Linux) to set up MLC LLM on your local machine. For usage with GPU, follow the instructions [here](https://llm.mlc.ai/docs/install/mlc_llm.html). You can customize the model that is used by changing the model parameters that are cloned in the last step. To see the other models that are supported, go [here](https://huggingface.co/mlc-ai/).

```bash
# Install MLC packages
python -m pip install --pre -U -f https://mlc.ai/wheels mlc-chat-nightly mlc-ai-nightly

# Enable Git LFS to clone large directories
git lfs install
mkdir -p mlc-llm/dist/prebuilt

# Download prebuilt binaries and model parameters
# Note: This will install the Mistral model parameters, but for other models simply clone the parameters of the model you would like to run
git clone https://github.com/mlc-ai/binary-mlc-llm-libs.git mlc-llm/dist/prebuilt/lib
cd mlc-llm/dist/prebuilt && git clone https://huggingface.co/mlc-ai/mlc-chat-Mistral-7B-Instruct-v0.2-q4f16_1
cd ../..
```

You can now launch the local server. Depending on the model you chose above, the command for this will be different.

```bash
cd mlc-llm
python -m mlc_chat.rest --model Mistral-7B-Instruct-v0.2-q4f16_1
```

### Building the Chrome extension

If you make any changes to the extension and would like to rebuild it, you will need to run the following commands. Start by installing `npm` [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

```bash
npm run build
npm run install
```

## Links

- You might want to check out our online public [Machine Learning Compilation course](https://mlc.ai) for a systematic
  walkthrough of our approaches.
- [WebLLM](https://webllm.mlc.ai/) is a companion project using MLC LLM's WebGPU and WebAssembly backend.
- [WebStableDiffusion](https://websd.mlc.ai/) is a companion project for diffusion models with the WebGPU backend.
- Icons from [FlatIcon](https://www.flaticon.com/)
