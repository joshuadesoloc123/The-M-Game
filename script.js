// Initialize Lucide Icons
lucide.createIcons();

// Audio Synthesizer Engine (Web Audio API)
let audioCtx = null;

function playPopSound() {
  const sfxEnabled = document.getElementById('toggle-sfx').checked;
  if (!sfxEnabled) return;

  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(450, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
}

function playBuzzerSound() {
  const sfxEnabled = document.getElementById('toggle-sfx').checked;
  if (!sfxEnabled) return;

  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, audioCtx.currentTime);
  osc.frequency.setValueAtTime(120, audioCtx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

// Game State Variables
let totalQuestions = 20;               // Dynamic length (10, 20, or 50)
let currentOperationMode = 'addition'; // 'addition', 'subtraction', 'multiplication', 'division'
let currentDigitMode = 'ones';          // 'ones', 'tens', 'hundreds', 'thousands'
let selectedTempOperation = null;
let selectedTempDigit = null;

let currentQuestionIndex = 0;
let score = 0;
let questions = [];
let isAnsweringBlocked = false;

// DOM Elements
const viewWrapper = document.getElementById('view-wrapper');
const btnPlay = document.getElementById('btn-play');
const btnBackMenu = document.getElementById('btn-back-menu');
const btnBackCategories = document.querySelectorAll('.btn-back-categories');

const modeCards = document.querySelectorAll('.mode-card');
const digitCards = document.querySelectorAll('.digit-card');

const lengthModal = document.getElementById('length-modal');
const lengthCard = document.getElementById('length-card');
const btnCloseLengthModal = document.getElementById('btn-close-length-modal');
const lengthOptionBtns = document.querySelectorAll('.length-option-btn');

const gameModeBadge = document.getElementById('game-mode-badge');
const questionTracker = document.getElementById('question-tracker');
const progressBarFill = document.getElementById('progress-bar-fill');
const questionDisplay = document.getElementById('question-display');
const choiceBtn0 = document.getElementById('choice-btn-0');
const choiceBtn1 = document.getElementById('choice-btn-1');

const resultsSubtext = document.getElementById('results-subtext');
const finalScoreDisplay = document.getElementById('final-score');
const scoreFeedback = document.getElementById('score-feedback');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnResultMenu = document.getElementById('btn-result-menu');

const btnSettings = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');
const settingsModal = document.getElementById('settings-modal');
const settingsCard = document.getElementById('settings-card');

// --- QUESTION GENERATOR --- //
function generateQuestions(operation, digit, count) {
  const generated = [];

  // Determine min/max range based on chosen digit mode
  let min = 1;
  let max = 9;

  if (digit === 'tens') {
    min = 10;
    max = 99;
  } else if (digit === 'hundreds') {
    min = 100;
    max = 999;
  } else if (digit === 'thousands') {
    min = 1000;
    max = 9999;
  }

  for (let i = 0; i < count; i++) {
    let num1, num2, correctAnswer;

    if (operation === 'multiplication') {
      // Scale down factor 2 for high digit modes to keep problems realistic
      let multMin2 = min;
      let multMax2 = max;
      if (digit === 'hundreds') { multMin2 = 2; multMax2 = 20; }
      if (digit === 'thousands') { multMin2 = 2; multMax2 = 50; }

      num1 = Math.floor(Math.random() * (max - min + 1)) + min;
      num2 = Math.floor(Math.random() * (multMax2 - multMin2 + 1)) + multMin2;
      correctAnswer = num1 * num2;
    } 
    else if (operation === 'division') {
      let divMin = min;
      let divMax = max;
      if (digit === 'hundreds') { divMin = 2; divMax = 50; }
      if (digit === 'thousands') { divMin = 2; divMax = 100; }

      const divisor = Math.floor(Math.random() * (divMax - divMin + 1)) + divMin;
      correctAnswer = Math.floor(Math.random() * (max - min + 1)) + min;
      const dividend = divisor * correctAnswer;
      num1 = dividend;
      num2 = divisor;
    } 
    else if (operation === 'subtraction') {
      num1 = Math.floor(Math.random() * (max - min + 1)) + min;
      num2 = Math.floor(Math.random() * (max - min + 1)) + min;
      if (num1 < num2) [num1, num2] = [num2, num1]; // Ensure non-negative results
      correctAnswer = num1 - num2;
    } 
    else { // Addition
      num1 = Math.floor(Math.random() * (max - min + 1)) + min;
      num2 = Math.floor(Math.random() * (max - min + 1)) + min;
      correctAnswer = num1 + num2;
    }

    // Generate smart wrong choice based on digit mode magnitude
    let wrongAnswer;
    let offsets = [1, 10];
    if (digit === 'tens') offsets = [1, 10, 5];
    if (digit === 'hundreds') offsets = [10, 100, 50];
    if (digit === 'thousands') offsets = [10, 100, 1000];

    const chosenOffset = offsets[Math.floor(Math.random() * offsets.length)];

    do {
      const sign = Math.random() < 0.5 ? -1 : 1;
      wrongAnswer = correctAnswer + (sign * chosenOffset);
      if (wrongAnswer <= 0) wrongAnswer = correctAnswer + chosenOffset;
    } while (wrongAnswer === correctAnswer);

    // Randomize 2 choice button positions
    const choices = Math.random() < 0.5 
      ? [correctAnswer, wrongAnswer] 
      : [wrongAnswer, correctAnswer];

    generated.push({
      num1,
      num2,
      operation,
      correctAnswer,
      choices
    });
  }
  return generated;
}

// --- GAMEPLAY CONTROLLER --- //
function startGame(operation, digit, qCount) {
  currentOperationMode = operation;
  currentDigitMode = digit;
  totalQuestions = qCount;
  currentQuestionIndex = 0;
  score = 0;

  questions = generateQuestions(currentOperationMode, currentDigitMode, totalQuestions);
  
  // Header Badge Symbol & Text
  const symbols = { addition: '➕', subtraction: '➖', multiplication: '✖️', division: '➗' };
  gameModeBadge.textContent = `${currentOperationMode.toUpperCase()} - ${currentDigitMode.toUpperCase()} ${symbols[currentOperationMode]}`;

  viewWrapper.style.transform = 'translateY(-600%)'; // Screen 6: Gameplay Screen
  loadQuestion();
}

function loadQuestion() {
  isAnsweringBlocked = false;
  const q = questions[currentQuestionIndex];

  resetChoiceButtons();

  questionTracker.textContent = `${currentQuestionIndex + 1} / ${totalQuestions}`;
  progressBarFill.style.width = `${((currentQuestionIndex) / totalQuestions) * 100}%`;
  
  const opSymbols = { addition: '+', subtraction: '-', multiplication: '×', division: '÷' };
  questionDisplay.textContent = `${q.num1} ${opSymbols[q.operation]} ${q.num2} = ?`;

  choiceBtn0.textContent = q.choices[0];
  choiceBtn1.textContent = q.choices[1];
}

function resetChoiceButtons() {
  [choiceBtn0, choiceBtn1].forEach((btn, idx) => {
    btn.className = `choice-btn p-5 sm:p-6 ${idx === 0 ? 'bg-cyan-400 hover:bg-cyan-300' : 'bg-pink-400 hover:bg-pink-300'} border-4 border-purple-900 rounded-3xl shadow-[0_8px_0_0_#2e1065] text-2xl sm:text-4xl font-black text-purple-950 active:translate-y-1 active:shadow-none transition-all cursor-pointer truncate`;
  });
}

function handleChoiceSelect(selectedIdx) {
  if (isAnsweringBlocked) return;
  isAnsweringBlocked = true;

  const currentQ = questions[currentQuestionIndex];
  const selectedBtn = selectedIdx === 0 ? choiceBtn0 : choiceBtn1;
  const selectedValue = currentQ.choices[selectedIdx];
  const isCorrect = selectedValue === currentQ.correctAnswer;

  if (isCorrect) {
    score++;
    playPopSound();
    selectedBtn.className = "choice-btn p-5 sm:p-6 bg-emerald-400 border-4 border-purple-900 rounded-3xl shadow-[0_8px_0_0_#2e1065] text-2xl sm:text-4xl font-black text-purple-950 transition-all cursor-default truncate";
  } else {
    playBuzzerSound();
    selectedBtn.className = "choice-btn p-5 sm:p-6 bg-red-500 border-4 border-purple-900 rounded-3xl shadow-[0_8px_0_0_#2e1065] text-2xl sm:text-4xl font-black text-white animate-shake transition-all cursor-default truncate";

    const correctBtn = currentQ.choices[0] === currentQ.correctAnswer ? choiceBtn0 : choiceBtn1;
    correctBtn.className = "choice-btn p-5 sm:p-6 bg-emerald-400 border-4 border-purple-900 rounded-3xl shadow-[0_8px_0_0_#2e1065] text-2xl sm:text-4xl font-black text-purple-950 transition-all cursor-default truncate";
  }

  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < totalQuestions) {
      loadQuestion();
    } else {
      showResults();
    }
  }, 1000);
}

function showResults() {
  progressBarFill.style.width = `100%`;
  viewWrapper.style.transform = 'translateY(-700%)'; // Screen 7: Results

  resultsSubtext.textContent = `You completed all ${totalQuestions} questions!`;
  finalScoreDisplay.textContent = `${score} / ${totalQuestions}`;

  const percentage = (score / totalQuestions) * 100;

  if (percentage === 100) {
    scoreFeedback.textContent = `🏆 PERFECT SCORE! ${score} out of ${totalQuestions}!`;
  } else if (percentage >= 75) {
    scoreFeedback.textContent = "⭐ GREAT JOB! You're really good at this!";
  } else if (percentage >= 50) {
    scoreFeedback.textContent = "👍 GOOD EFFORT! Keep practicing to get full marks!";
  } else {
    scoreFeedback.textContent = "💪 KEEP TRYING! You get better every time!";
  }

  confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
}

// Choice Button Event Listeners
choiceBtn0.addEventListener('click', () => handleChoiceSelect(0));
choiceBtn1.addEventListener('click', () => handleChoiceSelect(1));

// --- MODAL CONTROLLERS --- //
function openLengthModal(operation, digit) {
  playPopSound();
  selectedTempOperation = operation;
  selectedTempDigit = digit;
  lengthModal.classList.remove('opacity-0', 'pointer-events-none');
  lengthCard.classList.remove('translate-y-6');
}

function closeLengthModal() {
  playPopSound();
  lengthModal.classList.add('opacity-0', 'pointer-events-none');
  lengthCard.classList.add('translate-y-6');
}

digitCards.forEach(card => {
  card.addEventListener('click', () => {
    const operation = card.getAttribute('data-operation');
    const digit = card.getAttribute('data-digit');

    // Opens length selection modal for ALL digit modes!
    openLengthModal(operation, digit);
  });
});

lengthOptionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const qCount = parseInt(btn.getAttribute('data-length'), 10);
    closeLengthModal();
    startGame(selectedTempOperation, selectedTempDigit, qCount);
  });
});

btnCloseLengthModal.addEventListener('click', closeLengthModal);
lengthModal.addEventListener('click', (e) => {
  if (e.target === lengthModal) closeLengthModal();
});

// --- NAVIGATION LISTENERS --- //
btnPlay.addEventListener('click', () => {
  playPopSound();
  confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  viewWrapper.style.transform = 'translateY(-100%)';
});

btnBackMenu.addEventListener('click', () => {
  playPopSound();
  viewWrapper.style.transform = 'translateY(0%)';
});

btnBackCategories.forEach(btn => {
  btn.addEventListener('click', () => {
    playPopSound();
    viewWrapper.style.transform = 'translateY(-100%)';
  });
});

modeCards.forEach(card => {
  card.addEventListener('click', () => {
    playPopSound();
    const mode = card.getAttribute('data-mode');
    
    // Screen mapping for vertical scrolling
    if (mode === 'addition') viewWrapper.style.transform = 'translateY(-200%)';
    else if (mode === 'subtraction') viewWrapper.style.transform = 'translateY(-300%)';
    else if (mode === 'multiplication') viewWrapper.style.transform = 'translateY(-400%)';
    else if (mode === 'division') viewWrapper.style.transform = 'translateY(-500%)';
  });
});

btnPlayAgain.addEventListener('click', () => {
  playPopSound();
  startGame(currentOperationMode, currentDigitMode, totalQuestions);
});

btnResultMenu.addEventListener('click', () => {
  playPopSound();
  viewWrapper.style.transform = 'translateY(0%)';
});

// --- SETTINGS MODAL --- //
function openSettings() {
  playPopSound();
  settingsModal.classList.remove('opacity-0', 'pointer-events-none');
  settingsCard.classList.remove('translate-y-6');
}

function closeSettings() {
  playPopSound();
  settingsModal.classList.add('opacity-0', 'pointer-events-none');
  settingsCard.classList.add('translate-y-6');
}

btnSettings.addEventListener('click', openSettings);
btnCloseSettings.addEventListener('click', closeSettings);
btnSaveSettings.addEventListener('click', closeSettings);

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});