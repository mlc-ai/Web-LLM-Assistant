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
