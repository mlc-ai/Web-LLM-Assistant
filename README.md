# MLC Assistant
Chat with your documents and improve your writing using large-language models in your browser. We currently support using the MLC Assistant in [Overleaf](https://www.overleaf.com/), and plan on adding support for other platforms soon.

![demo](https://github.com/mlc-ai/mlc-assistant/assets/11940172/51f0668d-860e-4014-b104-4d2e0e7b334e)

## Getting Started

### 1. Install Git LFS

Follow the instructions [here](https://git-lfs.com) to install Git LFS.

### 2. Create Conda environment (optional)
```bash
conda create --name mlc_assistant python=3.10
conda activate mlc_assistant
```

**Note: For quick start, skip Steps 3-5, run `./startup.sh`, and continue from [Step 6](#step6).**

### 3. Set up MLC LLM

Follow the steps below (only for CPU on macOS, Windows, or Linux) to set up MLC LLM on your local machine. For usage with GPU, follow the instructions [here](https://llm.mlc.ai/docs/install/mlc_llm.html).

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

### 4. Build the Chrome extension (optional)
```bash
npm run build
npm run install
```

### 5. Launch the local server
```bash
cd mlc-llm
python -m mlc_chat.rest --model Mistral-7B-Instruct-v0.2-q4f16_1
```

### 6. Install the Chrome extension <a id='step6'></a>
Launch Google Chrome and navigate to the extensions page by entering `chrome://extensions`. Enable Developer Mode by clicking the toggle switch next to Developer mode. Click the Load unpacked button and select the `mlc-assistant/dist` directory.

<img src="https://github.com/mlc-ai/mlc-assistant/assets/11940172/cdb18fb3-24c5-41bf-9a40-484692c2150a" width="300">

### 7. Enable inline generation (optional)
If you'd like your text to be generated directly in the document (instead of in a popup), enable inline generation by going to `chrome://extensions`, selecting *Details* for the `mlc-assistant`, clicking on *Extension options*, and then toggling the inline generation option.


You can now go to any Overleaf document, and select `Option + Shift + 3` to invoke the MLC Assistant!
