const numCardsSelect = document.getElementById("numCards");
const bgColorSelect = document.getElementById("bgColor");
const saveBtn = document.getElementById("saveBtn");


//load saved settings on open
chrome.storage.sync.get(["numCards", "bgColor"], (data) => {
    if (data.numCards) numCardsSelect.value = data.numCards;
    if (data.bgColor) bgColorSelect.value = data.bgColor;
});

//save settings
saveBtn.addEventListener("click", () => {
    const settings = {
        numCards: numCardsSelect.value,
        bgColor: bgColorSelect.value
    };
    chrome.storage.sync.set(settings, () => {
        //send to service worker
        chrome.runtime.sendMessage({
            type: "settingsUpdated",
            settings
        });
        alert("Settings saved");
    });
});