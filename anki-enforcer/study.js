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
    let ids = await anki("findCards", { query: "is:review" });
    console.log("Found card IDs:", ids);
    let numberOfCards = 5;
    //take first X cards
    cardQueue = ids.slice(0, numberOfCards);
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
    await anki("answerCards", {
        answers: [{
            cardId: currentCard.cardId,
            ease: ease
        }]
    });
    currentCardIndex++;
    loadNextCard();
}

function finishStudy() {
    cardDiv.innerHTML = "<h2>Done!</h2><p>Unlocking...</p>";
    chrome.runtime.sendMessage("unlock");
}

flipBtn.addEventListener("click", flipCard);
reviewRow.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
        sendReview(parseInt(btn.dataset.ease));
    });
});

loadCards();