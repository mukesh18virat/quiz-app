const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

const questionElement = document.getElementById('question');
const answerButtons = document.getElementById('answer-buttons');
const questionCounter = document.getElementById('question-counter');
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');
const progressBar = document.getElementById('progress');
const timerDiv = document.querySelector('.timer');

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer;
let timeLeft = 15;
let totalTime = 0;
let questionStartTime;

// Local backup questions - API slow/fail hone pe ye use honge
const localQuestions = [{
        question: "Which is the largest planet in our solar system?",
        answers: [
            { text: "Earth", correct: false },
            { text: "Jupiter", correct: true },
            { text: "Mars", correct: false },
            { text: "Saturn", correct: false },
        ]
    },
    {
        question: "Who is the founder of Microsoft?",
        answers: [
            { text: "Steve Jobs", correct: false },
            { text: "Bill Gates", correct: true },
            { text: "Elon Musk", correct: false },
            { text: "Mark Zuckerberg", correct: false },
        ]
    },
    {
        question: "What is the capital of India?",
        answers: [
            { text: "Mumbai", correct: false },
            { text: "Kolkata", correct: false },
            { text: "New Delhi", correct: true },
            { text: "Chennai", correct: false },
        ]
    },
    {
        question: "HTML stands for?",
        answers: [
            { text: "Hyper Text Markup Language", correct: true },
            { text: "High Text Machine Language", correct: false },
            { text: "Hyper Tabular Markup Language", correct: false },
            { text: "None of these", correct: false },
        ]
    },
    {
        question: "Which year was JavaScript launched?",
        answers: [
            { text: "1996", correct: false },
            { text: "1995", correct: true },
            { text: "1994", correct: false },
            { text: "None of these", correct: false },
        ]
    },
    {
        question: "Which is the smallest continent?",
        answers: [
            { text: "Asia", correct: false },
            { text: "Australia", correct: true },
            { text: "Europe", correct: false },
            { text: "Africa", correct: false },
        ]
    },
    {
        question: "CSS stands for?",
        answers: [
            { text: "Cascading Style Sheets", correct: true },
            { text: "Computer Style Sheets", correct: false },
            { text: "Creative Style Sheets", correct: false },
            { text: "Colorful Style Sheets", correct: false },
        ]
    },
    {
        question: "How many seconds in 1 hour?",
        answers: [
            { text: "3000", correct: false },
            { text: "3600", correct: true },
            { text: "3500", correct: false },
            { text: "4000", correct: false },
        ]
    },
    {
        question: "Which gas do plants absorb?",
        answers: [
            { text: "Oxygen", correct: false },
            { text: "Carbon Dioxide", correct: true },
            { text: "Nitrogen", correct: false },
            { text: "Hydrogen", correct: false },
        ]
    },
    {
        question: "Who painted the Mona Lisa?",
        answers: [
            { text: "Vincent Van Gogh", correct: false },
            { text: "Pablo Picasso", correct: false },
            { text: "Leonardo da Vinci", correct: true },
            { text: "Michelangelo", correct: false },
        ]
    }
];

// Sound effects using Web Audio API
const audioCtx = new(window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration) {
    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.log('Sound not supported');
    }
}

const correctSound = () => playSound(800, 0.1);
const incorrectSound = () => playSound(300, 0.2);

// Load high score
document.getElementById('high-score').textContent = localStorage.getItem('quizHighScore') || 0;

// Event Listeners
startBtn.addEventListener('click', startQuiz);
nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    setNextQuestion();
});
restartBtn.addEventListener('click', () => startQuiz());
homeBtn.addEventListener('click', () => {
    resultScreen.style.display = 'none';
    startScreen.style.display = 'block';
});

async function startQuiz() {
    startScreen.style.display = 'none';
    quizScreen.style.display = 'block';
    resultScreen.style.display = 'none';

    const category = document.getElementById('category').value;
    const difficulty = document.getElementById('difficulty').value;
    const amount = document.getElementById('amount').value;

    questionElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading questions...';
    answerButtons.innerHTML = '';

    // 3 second timeout - API slow hui to local questions use karo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
    if (category !== 'any') url += `&category=${category}`;
    if (difficulty !== 'any') url += `&difficulty=${difficulty}`;

    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();

        if (data.results.length === 0) throw new Error('No questions from API');

        questions = data.results.map(q => {
            const answers = [...q.incorrect_answers, q.correct_answer]
                .sort(() => Math.random() - 0.5);
            return {
                question: decodeHTML(q.question),
                answers: answers.map(a => ({
                    text: decodeHTML(a),
                    correct: a === q.correct_answer
                }))
            };
        });
        console.log('API questions loaded');
    } catch (error) {
        console.log('Using local questions:', error.message);
        questions = localQuestions.slice(0, amount);
    }

    currentQuestionIndex = 0;
    score = 0;
    totalTime = 0;
    setNextQuestion();
}

function decodeHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

function setNextQuestion() {
    resetState();
    if (currentQuestionIndex < questions.length) {
        showQuestion(questions[currentQuestionIndex]);
        startTimer();
    } else {
        showResults();
    }
}

function showQuestion(question) {
    questionStartTime = Date.now();
    questionElement.innerHTML = question.question;
    questionCounter.textContent = `Question ${currentQuestionIndex + 1}/${questions.length}`;
    scoreElement.textContent = `Score: ${score}`;
    progressBar.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;

    question.answers.forEach(answer => {
        const button = document.createElement('button');
        button.innerHTML = answer.text;
        button.classList.add('answer-btn');
        if (answer.correct) button.dataset.correct = answer.correct;
        button.addEventListener('click', selectAnswer);
        answerButtons.appendChild(button);
    });
}

function resetState() {
    clearInterval(timer);
    nextBtn.style.display = 'none';
    while (answerButtons.firstChild) {
        answerButtons.removeChild(answerButtons.firstChild);
    }
    timerDiv.classList.remove('warning');
}

function startTimer() {
    timeLeft = 15;
    timeElement.textContent = timeLeft;
    timer = setInterval(() => {
        timeLeft--;
        timeElement.textContent = timeLeft;
        if (timeLeft <= 5) timerDiv.classList.add('warning');
        if (timeLeft === 0) {
            clearInterval(timer);
            selectAnswer({ target: { dataset: {} } });
        }
    }, 1000);
}

function selectAnswer(e) {
    clearInterval(timer);
    totalTime += (15 - timeLeft);

    const selectedBtn = e.target;
    const correct = selectedBtn.dataset.correct === 'true';

    if (correct) {
        score += 10 + timeLeft; // Bonus for speed
        selectedBtn.classList.add('correct');
        correctSound();
    } else {
        selectedBtn.classList.add('incorrect');
        incorrectSound();
    }

    Array.from(answerButtons.children).forEach(button => {
        if (button.dataset.correct === 'true') {
            button.classList.add('correct');
        }
        button.disabled = true;
    });

    scoreElement.textContent = `Score: ${score}`;
    nextBtn.style.display = 'block';
}

function showResults() {
    quizScreen.style.display = 'none';
    resultScreen.style.display = 'block';

    const maxScore = questions.length * 25; // 10 base + 15 max bonus
    const accuracy = ((score / maxScore) * 100).toFixed(1);
    const avgTime = (totalTime / questions.length).toFixed(1);

    document.getElementById('final-score').textContent = score;
    document.getElementById('accuracy').textContent = accuracy + '%';
    document.getElementById('avg-time').textContent = avgTime + 's';

    const resultMsg = document.getElementById('result-msg');
    if (accuracy >= 80) {
        resultMsg.textContent = 'Excellent! You are a Quiz Master! 🏆';
        resultMsg.style.background = '#d3f9d8';
        resultMsg.style.color = '#2b8a3e';
    } else if (accuracy >= 60) {
        resultMsg.textContent = 'Great Job! Keep practicing! 👏';
        resultMsg.style.background = '#fff3bf';
        resultMsg.style.color = '#e67700';
    } else {
        resultMsg.textContent = 'Good Try! Practice more! 💪';
        resultMsg.style.background = '#ffe3e3';
        resultMsg.style.color = '#c92a2a';
    }

    // Update high score
    const highScore = localStorage.getItem('quizHighScore') || 0;
    if (score > highScore) {
        localStorage.setItem('quizHighScore', score);
        document.getElementById('high-score').textContent = score;
        resultMsg.textContent += ' 🎉 New High Score!';
    }
}