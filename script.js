let gameState = {
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  totalPairs: 0,
  clicks: 0,
  timer: null,
  timeLeft: 0,
  isPlaying: false,
  canFlip: true,
  currentTheme: 'light',
  powerUpAvailable: true
};

// Creating all the dom elements here and event listeners
const gameBoard = document.getElementById('game-board');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const difficultySelect = document.getElementById('difficulty');
const themeToggle = document.getElementById('theme-toggle');
const powerUpBtn = document.getElementById('powerup-btn');
const timeDisplay = document.getElementById('time');
const clicksDisplay = document.getElementById('clicks');
const matchesDisplay = document.getElementById('matches');
const totalPairsDisplay = document.getElementById('total-pairs');
const gameMessage = document.getElementById('game-message');


startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
themeToggle.addEventListener('click', toggleTheme);
powerUpBtn.addEventListener('click', activatePowerUp);

// Update stats
function updateStats() {
  clicksDisplay.textContent = gameState.clicks;
  matchesDisplay.textContent = gameState.matchedPairs;
  totalPairsDisplay.textContent = gameState.totalPairs;
}

function newGame() {
  gameBoard.innerHTML = '';
  gameState.cards = [];
  gameState.flippedCards = [];
  gameState.matchedPairs = 0;
  gameState.clicks = 0;
  gameState.isPlaying = false;
  gameState.canFlip = true;
  gameState.powerUpAvailable = true;

  updateStats();
  updatePowerUpButton();
  gameMessage.textContent = '';
}

// Start timer
function startTimer() {
  clearInterval(gameState.timer);
  updateTimerDisplay();

  gameState.timer = setInterval(() => {
    gameState.timeLeft--;
    updateTimerDisplay();

    if (gameState.timeLeft <= 0) {
      endGame(false);
    }
  }, 1000);
}

// Update timer
function updateTimerDisplay() {
  const minutes = Math.floor(gameState.timeLeft / 60);
  const seconds = gameState.timeLeft % 60;
  timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const difficultySettings = {
  easy: { pairs: 6, time: 120 },
  medium: { pairs: 8, time: 90 },
  hard: { pairs: 12, time: 60 }
};

async function fetchRandomPokemon(count) {
  try {

    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1000');
    const data = await response.json();

    // Shuffling data, then select 0 to whatever the count is
    const shuffled = [...data.results].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    // Fetch details for each selected Pokémon
    const pokemonDetails = await Promise.all(
      selected.map(async ({ url }) => {
        const { name, sprites } = await (await fetch(url)).json();
        return {
          name,
          // Gets a detailed img, but if not, fallbacks to default img
          image: sprites.other['official-artwork'].front_default || sprites.front_default
        };
      })
    );

    return pokemonDetails;
  } catch (error) {
    console.error('Error fetching Pokémon:', error);
    throw error;
  }
}

async function startGame() {
  newGame();

  const difficulty = difficultySelect.value;
  const { pairs, time } = difficultySettings[difficulty];
  gameState.totalPairs = pairs;
  gameState.timeLeft = time;

  updateStats();


  try {
    const pokemonList = await fetchRandomPokemon(pairs);
    createCards(pokemonList);

    // Start timer
    gameState.isPlaying = true;
    startTimer();
  } catch (error) {
    console.error('Error starting game:', error);
    gameMessage.textContent = 'Error loading Pokémon. Please try again.';
  }
}

// Shuffle array
function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

// Flip card
function flipCard(cardElement, cardId) {
  if (!gameState.isPlaying || !gameState.canFlip) return;

  const card = gameState.cards.find(c => c.id === cardId);

  // Don't flip matched cards
  if (card.isFlipped || card.isMatched) return;

  // Don't flip if already flipped
  if (gameState.flippedCards.length >= 2) return;

  // Flip the card
  cardElement.classList.add('flipped');
  card.isFlipped = true;
  gameState.flippedCards.push(card);
  gameState.clicks++;
  updateStats();

  // Check for match when 2 cards are flipped
  if (gameState.flippedCards.length === 2) {
    checkForMatch();
  }
}

// Check if flipped cards match
function checkForMatch() {
  gameState.canFlip = false;

  const [card1, card2] = gameState.flippedCards;
  const cardElements = document.querySelectorAll('.card.flipped:not(.matched)');

  if (card1.name === card2.name) {
    // Matchs
    gameState.matchedPairs++;
    updateStats();

    // Mark cards as matched
    card1.isMatched = true;
    card2.isMatched = true;

    cardElements.forEach(el => el.classList.add('matched'));

    // Check for win
    if (gameState.matchedPairs === gameState.totalPairs) {
      endGame(true);
    }

    gameState.flippedCards = [];
    gameState.canFlip = true;
  } else {
    // No match - flip back after delay
    setTimeout(() => {
      cardElements.forEach(el => el.classList.remove('flipped'));

      card1.isFlipped = false;
      card2.isFlipped = false;

      gameState.flippedCards = [];
      gameState.canFlip = true;
    }, 1000);
  }
}

// End game
function endGame(isWin) {
  clearInterval(gameState.timer);
  gameState.isPlaying = false;

  if (isWin) {
    gameMessage.textContent = 'Congratulations! You won!';
  } else {
    gameMessage.textContent = 'Game Over! Time is up!';
  }
}

// Create card elements
function createCards(pokemonList) {
  // Duplicate each Pokémon to create pairs
  const cardData = [...pokemonList, ...pokemonList].map((pokemon, index) => ({
    id: index,
    name: pokemon.name,
    image: pokemon.image,
    isFlipped: false,
    isMatched: false
  }));

  // Shuffle the cards
  gameState.cards = shuffleArray(cardData);

  // Create card elements
  gameState.cards.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.dataset.id = card.id;

    cardElement.innerHTML = `
          <div class="card-face card-front">
              <img src="${card.image}" alt="${card.name}">
          </div>
          <div class="card-face card-back"></div>
      `;

    cardElement.addEventListener('click', () => flipCard(cardElement, card.id));
    gameBoard.appendChild(cardElement);
  });
}

// Reseting the game
function resetGame() {
  clearInterval(gameState.timer);
  newGame();
}

// Toggle theme
function toggleTheme() {
  // Using light-theme for switch out the colours in css with root selection.
  document.body.classList.toggle('light-theme');
  gameState.currentTheme = gameState.currentTheme === 'dark' ? 'light' : 'dark';
}

// Powerup state
function updatePowerUpButton() {
  powerUpBtn.disabled = !gameState.powerUpAvailable;
}

// Powerup feature
function activatePowerUp() {
  if (!gameState.isPlaying || !gameState.powerUpAvailable) return;

  gameState.powerUpAvailable = false;
  updatePowerUpButton();

  // Flip all cards
  const cards = document.querySelectorAll('.card:not(.flipped):not(.matched)');
  cards.forEach(card => {
    card.classList.add('flipped');
  });

  // Flip back after 3 second
  setTimeout(() => {
    cards.forEach(card => {
      if (!gameState.cards.find(c => c.id === parseInt(card.dataset.id)).isMatched) {
        card.classList.remove('flipped');
      }
    });

    // Re-enable powerups
    setTimeout(() => {
      gameState.powerUpAvailable = true;
      updatePowerUpButton();
    }, 30000);
  }, 3000);
}

newGame();