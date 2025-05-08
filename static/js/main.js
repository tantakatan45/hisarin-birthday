let quizData = [];
let currentQuestion = 0;

document.addEventListener('DOMContentLoaded', () => {
    fetch('/quiz')
        .then(response => response.json())
        .then(data => {
            quizData = data;
            showQuestion();
        });

    document.getElementById('next-button').addEventListener('click', () => {
        currentQuestion++;
        if (currentQuestion < quizData.length) {
            showQuestion();
        } else {
            showCompletion();
        }
    });
});

function showQuestion() {
    const q = quizData[currentQuestion];

    document.getElementById('chapter-title').textContent = q.chapter;
    document.getElementById('chapter-subtitle').textContent = q.chapter_subtitle;
    document.getElementById('question-text').textContent = `Q${q.id}: ${q.question}`;

    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';

    for (const [key, value] of Object.entries(q.choices)) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-primary m-2';
        btn.textContent = `${key}: ${value}`;
        btn.addEventListener('click', () => handleAnswer(key, q));
        choicesDiv.appendChild(btn);
    }

    document.getElementById('explanation').classList.add('d-none');
    document.getElementById('next-button').classList.add('d-none');
}

function handleAnswer(selected, q) {
    const explanationDiv = document.getElementById('explanation');
    let explanationText = '';

    if (selected === q.answer) {
        explanationText = `✅ 正解！\n${q.answer_explanation}`;
    } else {
        explanationText = `❌ 不正解。\n正解は ${q.answer}: ${q.choices[q.answer]}。\n\n${q.answer_explanation}\n\nあなたの選んだ ${selected}: ${q.choices[selected]} → ${q.wrong_explanations[selected]}`;
    }

    explanationDiv.textContent = explanationText;
    explanationDiv.classList.remove('d-none');
    document.getElementById('next-button').classList.remove('d-none');

    const buttons = document.querySelectorAll('#choices button');
    buttons.forEach(btn => btn.disabled = true);
}

function showCompletion() {
    document.getElementById('quiz-container').innerHTML = `<h3 class="text-center">全問終了！お疲れさまでした。</h3>`;
    document.getElementById('explanation').classList.add('d-none');
    document.getElementById('next-button').classList.add('d-none');
}
