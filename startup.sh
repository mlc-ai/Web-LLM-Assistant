# Install MLC LLM packages
if python -c "from mlc_chat import ChatModule" &> /dev/null; then
    echo "MLC packages are present, skipping install."
else
    echo "Installing MLC packages"
    python -m pip install --pre -U -f https://mlc.ai/wheels mlc-chat-nightly mlc-ai-nightly
fi

# Download prebuilt binaries and model parameters
if [ -d mlc-llm/dist/prebuilt ]; then
    echo "mlc-llm/dist/prebuilt exists, skipping download of prebuilt binaries and model parameters."
else
    echo "Downloading prebuilt binaries and model parameters."
    mkdir -p mlc-llm/dist/prebuilt
    git clone https://github.com/mlc-ai/binary-mlc-llm-libs.git mlc-llm/dist/prebuilt/lib
    cd mlc-llm/dist/prebuilt && git clone https://huggingface.co/mlc-ai/mlc-chat-Llama-2-7b-chat-hf-q4f16_1
    cd ../..
fi

# Start the local server
cd mlc-llm
python -m mlc_chat.rest --model Llama-2-7b-chat-hf-q4f16_1