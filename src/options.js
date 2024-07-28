const inlineSwitch = document.getElementById("inline");
// Set value correctly if it has been previously set
chrome.storage.sync.get({ inlineMode: false }, (items) => {
  inlineSwitch.checked = items.inlineMode;
});
inlineSwitch.addEventListener("change", function () {
  if (this.checked) {
    console.log("Checkbox is checked..");
    chrome.storage.sync.set({ inlineMode: true });
  } else {
    console.log("Checkbox is not checked..");
    chrome.storage.sync.set({ inlineMode: false });
  }
});

const promptCust = document.getElementById("promptCustomization");

chrome.storage.sync.get({ customization: 0 }, (items) => {
  promptCust.value = items.customization;
});

promptCust.addEventListener("change", function () {
  if (this.value == 0) {
    console.log("Prompt customization set to default");
    chrome.storage.sync.set({ customization: 0 });
  } else if (this.value == 1) {
    console.log("Prompt customization set to creative");
    chrome.storage.sync.set({ customization: 1 });
  } else {
    console.log("Prompt customization set to critical");
    chrome.storage.sync.set({ customization: 2 });
  }
});
