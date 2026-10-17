// Rock, Paper, Scissors

const MOVES = {
    Rock: { emoji: "✊" },
    Paper: { emoji: "✋" },
    Scissors: { emoji: "✌️" }
};
const WINNING_SCORE = 3;
const COUNTDOWN_STEPS = ["3", "2", "1", "GO!"];
const STEP_DELAY = 450;

function getRandomComputerResult() {
    const options = Object.keys(MOVES);
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex];
}

function hasPlayerWonTheRound(player, computer) {
    return (
        (player === "Rock" && computer === "Scissors") ||
        (player === "Scissors" && computer === "Paper") ||
        (player === "Paper" && computer === "Rock")
    );
}

function getRoundOutcome(userOption, computerResult) {
    if (hasPlayerWonTheRound(userOption, computerResult)) return "win";
    if (computerResult === userOption) return "tie";
    return "lose";
}

function getRoundMessage(outcome, userOption, computerResult) {
    if (outcome === "win") return `Player wins! ${userOption} beats ${computerResult}`;
    if (outcome === "tie") return `It's a tie! Both chose ${userOption}`;
    return `Computer wins! ${computerResult} beats ${userOption}`;
}

let playerScore = 0;
let computerScore = 0;
let isRoundRunning = false;

const playerScoreEl = document.getElementById("player-score");
const computerScoreEl = document.getElementById("computer-score");
const playerCard = document.querySelector(".score-card.player");
const playerPickEl = document.getElementById("player-pick");
const computerPickEl = document.getElementById("computer-pick");
const arenaEl = document.getElementById("arena");
const countdownEl = document.getElementById("countdown");
const roundResultsMsg = document.getElementById("results-msg");
const winnerMsgElement = document.getElementById("winner-msg");
const optionsContainer = document.querySelector(".options-container");
const resetGameBtn = document.getElementById("reset-game-btn");
const moveButtons = document.querySelectorAll(".move");

function setMovesEnabled(enabled) {
    moveButtons.forEach(button => {
        button.disabled = !enabled;
    });
}

function runCountdown(steps, onDone) {
    let index = 0;
    countdownEl.classList.remove("is-off");

    const nextStep = () => {
        if (index === steps.length) {
            countdownEl.classList.add("is-off");
            onDone();
            return;
        }
        countdownEl.textContent = steps[index++];
        Fun.replayAnimation(countdownEl, "tick");
        setTimeout(nextStep, STEP_DELAY);
    };

    nextStep();
}

function playRound(userOption) {
    if (isRoundRunning) return;

    isRoundRunning = true;
    setMovesEnabled(false);
    roundResultsMsg.textContent = "";
    roundResultsMsg.className = "results-msg";

    playerPickEl.textContent = MOVES[userOption].emoji;
    computerPickEl.textContent = "❔";
    arenaEl.classList.add("charging");

    runCountdown(COUNTDOWN_STEPS, () => {
        arenaEl.classList.remove("charging");
        revealRound(userOption);
    });
}

function revealRound(userOption) {
    const computerResult = getRandomComputerResult();
    const outcome = getRoundOutcome(userOption, computerResult);

    if (outcome === "win") playerScore++;
    if (outcome === "lose") computerScore++;

    playerPickEl.textContent = MOVES[userOption].emoji;
    computerPickEl.textContent = MOVES[computerResult].emoji;
    Fun.replayAnimation(playerPickEl, "reveal");
    Fun.replayAnimation(computerPickEl, "reveal");

    roundResultsMsg.textContent = getRoundMessage(outcome, userOption, computerResult);
    roundResultsMsg.className = `results-msg ${outcome}`;
    Fun.replayAnimation(roundResultsMsg, "pop");

    updateScores(outcome);

    if (outcome === "win") Fun.launchConfetti(18);

    if (playerScore === WINNING_SCORE || computerScore === WINNING_SCORE) {
        endGame();
    } else {
        isRoundRunning = false;
        setMovesEnabled(true);
    }
}

function updateScores(outcome) {
    playerScoreEl.textContent = playerScore;
    computerScoreEl.textContent = computerScore;

    if (outcome === "win") Fun.replayAnimation(playerScoreEl, "pop");
    if (outcome === "lose") {
        Fun.replayAnimation(computerScoreEl, "pop");
        Fun.replayAnimation(playerCard, "shake");
    }
}

function endGame() {
    const playerWon = playerScore === WINNING_SCORE;

    winnerMsgElement.textContent = `${playerWon ? "Player" : "Computer"} has won the game!`;
    Fun.replayAnimation(winnerMsgElement, "pop");
    if (playerWon) Fun.launchConfetti(140);

    optionsContainer.hidden = true;
    resetGameBtn.hidden = false;
}

function resetGame() {
    playerScore = 0;
    computerScore = 0;
    isRoundRunning = false;

    playerScoreEl.textContent = playerScore;
    computerScoreEl.textContent = computerScore;
    playerPickEl.textContent = "❔";
    computerPickEl.textContent = "❔";
    roundResultsMsg.textContent = "";
    roundResultsMsg.className = "results-msg";
    winnerMsgElement.textContent = "";

    resetGameBtn.hidden = true;
    optionsContainer.hidden = false;
    setMovesEnabled(true);
}

moveButtons.forEach(button => {
    button.addEventListener("click", () => playRound(button.dataset.move));
});

resetGameBtn.addEventListener("click", resetGame);
