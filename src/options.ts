const temperatureSelect = document.getElementById(
  "temperature",
) as HTMLSelectElement;
const contextSelect = document.getElementById(
  "context",
) as HTMLSelectElement;

chrome.storage.sync.get({ temperature: 0.5, contextLength: 16384 }, (items) => {
  temperatureSelect.value = items.temperature;
  contextSelect.value = items.contextLength;
});

temperatureSelect.onchange = () => {
  chrome.storage.sync.set({ temperature: parseFloat(temperatureSelect.value) });
};
contextSelect.onchange = () => {
  chrome.storage.sync.set({ contextLength: parseInt(contextSelect.value) });
};