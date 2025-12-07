const numCardsSelect = document.getElementById("numCards");
const bgColorSelect = document.getElementById("bgColor");
const saveBtn = document.getElementById("saveBtn");
const deckContainer = document.getElementById("deckContainer");

async function anki(action, params = {}) {
    const response = await fetch("http://127.0.0.1:8765", {
        method: "POST",
        body: JSON.stringify({
            action,
            version: 6,
            params
        })
    });
    const json = await response.json();
    if (json.error) throw new Error(json.error);
    return json.result;
}


//load saved settings on open
chrome.storage.sync.get(["numCards", "bgColor", "selectedDecks"], async (data) => {
    if (data.numCards) numCardsSelect.value = data.numCards;
    if (data.bgColor) bgColorSelect.value = data.bgColor;
    const savedDecks = data.selectedDecks || [];
    deckContainer.innerHTML = "<p>Loading decks...</p>";
    fetchDecks(savedDecks);
});

async function fetchDecks(savedDecks) {
    let decks = [];
    try {
        decks = await anki("deckNames");
    } catch (e) {
        console.error("failed to fetch decks from anki: ", e);
        deckContainer.innerHTML = "<p>Failed to load decks.</p>"
        return;
    }
    //populate after fetch
    deckContainer.innerHTML = "";
    decks.forEach(deck => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = deck;
        if (savedDecks.includes(deck)) checkbox.checked = true;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(" " + deck));
        deckContainer.appendChild(label);
    });
}

//save settings
saveBtn.addEventListener("click", () => {
    const selectedDecks = [...deckContainer.querySelectorAll("input[type=checkbox]")]
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    chrome.storage.sync.set({
        numCards: numCardsSelect.value,
        bgColor: bgColorSelect.value,
        selectedDecks
    }, () => {
        alert("settings saved");
        //notify study tab to apply immediately
        chrome.runtime.sendMessage({ type: "settingsUpdated", settings: {
            numCards: numCardsSelect.value,
            bgColor: bgColorSelect.value,
            selectedDecks
        }});
    });
});