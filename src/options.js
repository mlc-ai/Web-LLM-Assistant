const inlineSwitch = document.getElementById("inline");
// Set value correctly if it has been previously set
chrome.storage.sync.get(
    { inlineMode: false },
    (items) => {
        inlineSwitch.checked = items.inlineMode;
    }
  );
inlineSwitch.addEventListener('change', function() {
    if (this.checked) {
      console.log("Checkbox is checked..");
      chrome.storage.sync.set( { inlineMode: true } );
    } else {
      console.log("Checkbox is not checked..");
      chrome.storage.sync.set( { inlineMode: false } );
    }
});