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
    cardDiv.innerHTML = `<h2>${showingBack ? card.back : card.front}</h2>
    <div id="buttons"></div>
  `;
    const buttonsDiv = document.getElementById("buttons");

    //flip button
    const flipBtn = document.createElement("button");
    flipBtn.textContent = "Flip";
    flipBtn.addEventListener("click", flipCard);
    buttonsDiv.appendChild(flipBtn);
    
    //next button
    if (showingBack) {
        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next";
        nextBtn.addEventListener("click", nextCard);
        buttonsDiv.appendChild(nextBtn);
    }
}

function flipCard() {
    showingBack = true;
    renderCard();
};

function nextCard() {
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