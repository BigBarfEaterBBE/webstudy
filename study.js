// currently uses cards => later use AnkiWeb login to sync user cards
let cards = [
    { front: "Capital of France?", back: "Paris" },
    { front: "My favorite color", back: "Pink" },
    { front: "Atomic number of hydrogen", back: "1"}
];

let index = 0;
let showingBack = false;

const cardDiv = document.getElementById("card");

function renderCard() {
    let card = cards[index];
    cardDiv.innerHTML = `
    <h2>${showingBack ? card.back : card.front}</h2>
    <button onclick="flipCard()">Flip</button>
    ${showingBack ? '<button onclick="nextCard()">Next</button>' : ""}
  ` ;
}

window.flipCard = function () {
    showingBack = true;
    renderCard();
};

window.nextCard = function () {
    index++;
    showingBack = false;

    if (index >= cards.length) {
        finishStudy();
    } else {
        renderCard();
    }
};

function finishStudy() {
    cardDiv.innerHTML = "<h2>Study finished!</h2><p>Unlocking browser...</p>";
    chrome.runtime.sendMessage("unlock");
}

renderCard();