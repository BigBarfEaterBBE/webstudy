const studyPort = chrome.runtime.connect({ name: "study-session" });

let reviewedCardIds = new Set();
let numberOfCards = 5;
let bgColor = "#111"
let selectedDecks = ["Default"]
let cardsCompletedThisSession = 0;

//load storage
chrome.storage.sync.get(["numCards", "bgColor", "selectedDecks"], async (data) => {
    if (data.numCards) numberOfCards = parseInt(data.numCards);
    if (data.bgColor) {
        bgColor = data.bgColor;
        applyTheme(bgColor);
    };
    if (data.selectedDecks) selectedDecks = data.selectedDecks;
    if (!selectedDecks ||  selectedDecks.length === 0) {
        try {
            const decks = await anki("deckNames");
            selectedDecks = decks; // select all decks bby default
        } catch (e) {
            console.warn("Could not fetch decks from anki: ", e);
            selectedDecks = [];
        }
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "settingsUpdated") {
        const { numCards, bgColor, selectedDecks: newDecks} = message.settings;
        const decksChanged = JSON.stringify(newDecks) !== JSON.stringify(selectedDecks);
        closeSettings();
        //update local
        const newCardCount = parseInt(numCards);
        applyTheme(bgColor);
        //appl
        document.body.style.background = bgColor;
        selectedDecks = newDecks;
        if (newCardCount !== numberOfCards || decksChanged) {
            numberOfCards = newCardCount;
            cardQueue = [];
            currentCardIndex = 0;
            currentCard = null;
            cardDiv.innerHTML = "<p>Reloading cards</p>";
            loadCards();
        }
        document.querySelector("h1").textContent = `Study ${numberOfCards} Anki Cards`;
        console.log("Live settings applied: ", message.settings);
    }
});

function applyTheme(color) {
    document.body.classList.remove("light-mode", "dark-mode");
    if (color === "#fff") {
        document.body.classList.add("light-mode");
    } else {
        document.body.classList.add("dark-mode");
    }
}

//call ankiconnect
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

//app state
let cardQueue = [];
let currentCardIndex = 0;
let currentCard = null;

const cardDiv = document.getElementById("card");
const flipBtn = document.getElementById("flipBtn");
const reviewRow = document.getElementById("reviewRow");

//load X cards
async function loadCards() {
    console.log("Fetching due cards...");
    //create query for AnkiConnect
    if (!selectedDecks || selectedDecks.length === 0) {
        cardDiv.innerHTML = "<p>No decks available. Is Anki Running? </p>";
        return;
    }
    let deckQuery = selectedDecks.map(deck => `deck:"${deck}"`).join(" OR ");
    let query = `(${deckQuery}) is:due`; //only due cards
    console.log("Decks being queried:", selectedDecks);
    console.log("Anki query:", query);

    let ids = await anki("findCards", { query });
    ids = ids.filter(id => !reviewedCardIds.has(id));
    console.log("Found card IDs:", ids);
    if (!ids || ids.length === 0) {
        cardDiv.innerHTML = "<p>No due cards found in selected decks. </p>";
        flipBtn.style.display = "none";
        reviewRow.style.display = "none";
        return;
    }
    //take first X cards
    const remaining = Math.max(numberOfCards - cardsCompletedThisSession, 0);
    if (remaining === 0) {
        finishStudy();
        return;
    }
    cardQueue = ids.slice(0, remaining);
    if (cardQueue.length === 0) {
        finishStudy();
        return;
    }
    loadNextCard();
}

//display next card
async function loadNextCard() {
    if (currentCardIndex >= cardQueue.length) {
        finishStudy();
        return;
    }
    const cardId = cardQueue[currentCardIndex];
    const info = await anki("cardsInfo", { cards: [cardId] });
    currentCard = info[0];
    //display card
    cardDiv.innerHTML = currentCard.question;
    flipBtn.style.display = "inline-block";
    reviewRow.style.display = "none";
}

function flipCard() {
    cardDiv.innerHTML = currentCard.answer;
    flipBtn.style.display = "none";
    reviewRow.style.display = "flex";
}

//handle sending info back to anki
async function sendReview(ease) {
    try {
        await anki("answerCards", {
            answers: [{
                cardId: currentCard.cardId,
                ease: ease
            }]
        });
    } catch (e) {
        console.warn("Anki rejected answer, skipping:", e.message);
    }
    reviewedCardIds.add(currentCard.cardId);
    cardsCompletedThisSession++;
    currentCardIndex++;
    loadNextCard();
}

function finishStudy() {
    reviewedCardIds.clear();
    cardsCompletedThisSession = 0;
    cardDiv.innerHTML = "<h2>Done!</h2><p>Unlocking...</p>";
    if (studyPort) {
        try {
            studyPort.postMessage({ type: "unlock" });
        } catch (e) {
            console.warn("Port failed, falling back to sendMessage");
            chrome.runtime.sendMessage({ type: "unlock" });
        }
    } else {
        console.warn("No port");
        chrome.runtime.sendMessage({ type: "unlock" });
    }
}

flipBtn.addEventListener("click", flipCard);
reviewRow.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
        sendReview(parseInt(btn.dataset.ease));
    });
});

const settingsBtn = document.getElementById("settingsBtn");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettingsBtn = document.getElementById("closeSettings");
function openSettings() {
    settingsOverlay.classList.add("active");
    disableStudy();
}

function closeSettings() {
    settingsOverlay.classList.remove("active");
    enableStudy();
}
settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);

function disableStudy() {
    flipBtn.disabled = true;
    reviewRow.querySelectorAll("button").forEach(b => b.disabled = true);
}

function enableStudy() {
    flipBtn.disabled = false;
    reviewRow.querySelectorAll("button").forEach(b => b.disabled = false);
}

async function initStudy() {
    const data = await chrome.storage.sync.get([
        "numCards",
        "bgColor",
        "selectedDecks"
    ]);
    if (data.numCards) numberOfCards = parseInt(data.numCards);
    if (data.bgColor) {
        bgColor = data.bgColor;
        applyTheme(bgColor);
    }
    if (data.selectedDecks && data.selectedDecks.length > 0) {
        selectedDecks = data.selectedDecks;
    } else {
        try {
            selectedDecks = await anki("deckNames");
        } catch (e) {
            console.error("Anki not available", e);
            cardDiv.innerHTML = "<p>Start Anki first</p>";
            return;
        }
    }
    console.log("Final selected decks:", selectedDecks);
    loadCards();
}

initStudy();