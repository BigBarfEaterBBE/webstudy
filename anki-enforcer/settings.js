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
    chrome.storage.sync.set({
        numCards: numCardsSelect.value,
        bgColor: bgColorSelect.value
    }, () => {
        alert("Settings saved");
    });
});