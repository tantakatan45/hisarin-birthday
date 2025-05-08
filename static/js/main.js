// グローバル変数
let quizData = [];         // クイズデータ
let quotesData = [];       // 名言データ
let achievementsData = []; // アチーブメントデータ
let currentQuestion = 0;   // 現在の問題インデックス
let score = 0;             // スコア
let answeredQuestions = 0; // 回答済みの問題数
let userName = '';         // ユーザー名
let quizMode = 'normal';   // クイズモード（normal, challenge, relax）
let timer;                 // タイマーID
let timeRemaining;         // 残り時間
let timeLimit = 30;        // 制限時間（秒）
let lastChapter = "";      // 最後に表示した章
let usedHintOnCurrentQuestion = false; // 現在の問題でヒントを使ったか
let completedChapters = new Set(); // 完了した章を記録
let dailyChallengeMode = false;    // 日替わりチャレンジモードかどうか
let userAnswers = [];      // ユーザーの回答を記録

// モーダル
let hintModal;
let shareModal;

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
    // モーダルの初期化
    hintModal = new bootstrap.Modal(document.getElementById('hint-modal'));
    shareModal = new bootstrap.Modal(document.getElementById('share-modal'));
    
    // クイズデータの取得
    fetch('/quiz')
        .then(response => response.json())
        .then(data => {
            quizData = data.quiz_data;
            quotesData = data.quotes;
            achievementsData = data.achievements;
            
            // セッションに保存されたユーザー名があれば使用
            if (data.username) {
                document.getElementById('username').value = data.username;
            }
        })
        .catch(error => {
            console.error('Error fetching quiz data:', error);
            alert('クイズデータの取得に失敗しました。再読み込みしてください。');
        });
    
    // スタートボタンのイベントリスナー
    document.getElementById('start-button').addEventListener('click', () => {
        startQuiz();
    });
    
    // 日替わりチャレンジボタン
    document.getElementById('daily-challenge-button').addEventListener('click', () => {
        dailyChallengeMode = true;
        fetch('/daily_challenge')
            .then(response => response.json())
            .then(data => {
                quizData = data;
                startQuiz();
            })
            .catch(error => {
                console.error('Error fetching daily challenge:', error);
                alert('日替わりチャレンジの取得に失敗しました。');
                dailyChallengeMode = false;
            });
    });
    
    // 次の問題ボタンのイベントリスナー
    document.getElementById('next-button').addEventListener('click', () => {
        nextQuestion();
    });
    
    // ヒントボタンのイベントリスナー
    document.getElementById('hint-button').addEventListener('click', () => {
        showHint();
    });
    
    // リスタートボタンのイベントリスナー
    document.getElementById('restart-button').addEventListener('click', () => {
        restartQuiz();
    });
    
    // ホームに戻るボタン
    document.getElementById('home-button').addEventListener('click', () => {
        resetQuiz();
        showWelcomeScreen();
    });
    
    // 章間休憩画面の続けるボタン
    document.getElementById('continue-button').addEventListener('click', () => {
        document.getElementById('break-screen').classList.add('d-none');
        document.getElementById('quiz-container').classList.remove('d-none');
        showQuestion();
    });
    
    // シェアボタン
    document.getElementById('share-button').addEventListener('click', () => {
        prepareShareContent();
        shareModal.show();
    });
    
    // シェアテキストのコピーボタン
    document.getElementById('copy-share-text').addEventListener('click', () => {
        const shareText = document.getElementById('share-text');
        shareText.select();
        document.execCommand('copy');
        alert('コピーしました！');
    });
    
    // SNSシェアボタン
    document.getElementById('share-twitter').addEventListener('click', () => {
        const text = encodeURIComponent(document.getElementById('share-text').value);
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    });
    
    document.getElementById('share-facebook').addEventListener('click', () => {
        const text = encodeURIComponent(document.getElementById('share-text').value);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${text}`, '_blank');
    });
    
    document.getElementById('share-line').addEventListener('click', () => {
        const text = encodeURIComponent(document.getElementById('share-text').value);
        window.open(`https://social-plugins.line.me/lineit/share?text=${text}`, '_blank');
    });
    
    // ダークモードトグルボタンを追加
    addDarkModeToggle();
});

// クイズスタート
function startQuiz() {
    // ユーザー名を取得
    userName = document.getElementById('username').value || 'ゲスト';
    
    // モード選択を取得
    const modeInputs = document.querySelectorAll('input[name="quiz-mode"]');
    modeInputs.forEach(input => {
        if (input.checked) {
            quizMode = input.value;
        }
    });
    
    // モードに応じてタイマー設定
    switch (quizMode) {
        case 'challenge':
            timeLimit = 20; // チャレンジモードは短め
            break;
        case 'relax':
            timeLimit = 0;  // リラックスモードはタイマーなし
            break;
        default:
            timeLimit = 30; // 通常モード
    }
    
    // 変数の初期化
    currentQuestion = 0;
    score = 0;
    answeredQuestions = 0;
    lastChapter = "";
    completedChapters.clear();
    userAnswers = [];
    
    // ウェルカム画面を隠してクイズ画面を表示
    document.getElementById('welcome-screen').classList.add('d-none');
    document.getElementById('quiz-container').classList.remove('d-none');
    
    // 最初の問題を表示
    showQuestion();
}

// 問題表示
function showQuestion() {
    const q = quizData[currentQuestion];
    usedHintOnCurrentQuestion = false;
    
    // プログレスバーの更新
    updateProgress();
    
    // 章情報の表示
    document.getElementById('chapter-title').textContent = q.chapter;
    document.getElementById('chapter-subtitle').textContent = q.chapter_subtitle;
    
    // 問題テキストの表示
    document.getElementById('question-text').textContent = `Q${q.id}: ${q.question}`;
    
    // 選択肢の表示
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    
    for (const [key, value] of Object.entries(q.choices)) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-primary m-2 slide-in';
        btn.textContent = `${key}: ${value}`;
        btn.addEventListener('click', () => handleAnswer(key, q));
        choicesDiv.appendChild(btn);
    }
    
    // 解説と次へボタンを隠す
    document.getElementById('explanation').classList.add('d-none');
    document.getElementById('next-button').classList.add('d-none');
    
    // ヒントボタンをリセット
    document.getElementById('hint-button').classList.remove('d-none');
    document.getElementById('hint-penalty').classList.add('d-none');
    
    // タイマーの開始
    startTimer();
}

// タイマー開始
function startTimer() {
    // リラックスモードではタイマーを表示しない
    if (quizMode === 'relax') {
        document.getElementById('timer').classList.add('d-none');
        return;
    }
    
    // タイマー要素を表示
    document.getElementById('timer').classList.remove('d-none');
    
    // 前のタイマーがあれば停止
    if (timer) {
        clearInterval(timer);
    }
    
    // タイマーの設定
    timeRemaining = timeLimit;
    updateTimerDisplay();
    
    // タイマー開始
    timer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timer);
            handleTimeout();
        }
    }, 1000);
}

// タイマー表示の更新
function updateTimerDisplay() {
    const timerEl = document.getElementById('timer');
    timerEl.textContent = `残り時間: ${timeRemaining}秒`;
    
    // 残り時間に応じて色を変更
    if (timeRemaining <= 5) {
        timerEl.className = 'alert alert-danger mt-2 mb-3';
    } else if (timeRemaining <= 10) {
        timerEl.className = 'alert alert-warning mt-2 mb-3';
    } else {
        timerEl.className = 'alert alert-info mt-2 mb-3';
    }
}

// タイムアウト処理
function handleTimeout() {
    const q = quizData[currentQuestion];
    
    // 全ての選択肢を無効化
    const buttons = document.querySelectorAll('#choices button');
    buttons.forEach(btn => btn.disabled = true);
    
    // 正解を表示
    const explanationDiv = document.getElementById('explanation');
    explanationDiv.textContent = `⏰ 時間切れ！\n正解は ${q.answer}: ${q.choices[q.answer]} でした。\n\n${q.answer_explanation}`;
    explanationDiv.classList.remove('d-none');
    
    // 次へボタンを表示
    document.getElementById('next-button').classList.remove('d-none');
    
    // ユーザーの回答を記録（時間切れ）
    userAnswers.push({
        questionId: q.id,
        userAnswer: "時間切れ",
        correctAnswer: q.answer,
        isCorrect: false
    });
    
    // 回答済み問題をカウント
    answeredQuestions++;
}

// プログレスバーの更新
function updateProgress() {
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    
    if (quizData.length > 0) {
        const percentage = ((currentQuestion) / quizData.length) * 100;
        progressText.textContent = `${currentQuestion + 1} / ${quizData.length}`;
        progressBar.style.width = `${percentage}%`;
    }
}

// 回答処理
function handleAnswer(selected, q) {
    // タイマーを停止
    if (timer) {
        clearInterval(timer);
    }
    
    // 全ての選択肢を無効化
    const buttons = document.querySelectorAll('#choices button');
    buttons.forEach(btn => {
        btn.disabled = true;
        
        // 正解/不正解に応じてボタンの色を変更
        if (btn.textContent.startsWith(selected)) {
            if (selected === q.answer) {
                btn.className = 'btn btn-success m-2';
            } else {
                btn.className = 'btn btn-danger m-2';
            }
        } else if (btn.textContent.startsWith(q.answer)) {
            btn.className = 'btn btn-success m-2';
        }
    });
    
    // ヒントボタンを隠す
    document.getElementById('hint-button').classList.add('d-none');
    
    // 正解/不正解の解説を表示
    const explanationDiv = document.getElementById('explanation');
    let explanationText = '';
    let isCorrect = false;
    
    if (selected === q.answer) {
        isCorrect = true;
        explanationText = `✅ 正解！\n${q.answer_explanation}`;
        
        // ヒントを使っていなければスコアを加算
        if (!usedHintOnCurrentQuestion) {
            score++;
        } else {
            // ヒント使用時は半分のポイント（小数点以下切り捨て）
            score += 0.5;
        }
    } else {
        explanationText = `❌ 不正解。\n正解は ${q.answer}: ${q.choices[q.answer]}。\n\n${q.answer_explanation}\n\nあなたの選んだ ${selected}: ${q.choices[selected]} → ${q.wrong_explanations[selected]}`;
    }
    
    explanationDiv.textContent = explanationText;
    explanationDiv.classList.remove('d-none');
    
    // 次へボタンを表示
    document.getElementById('next-button').classList.remove('d-none');
    
    // ユーザーの回答を記録
    userAnswers.push({
        questionId: q.id,
        userAnswer: selected,
        correctAnswer: q.answer,
        isCorrect: isCorrect,
        usedHint: usedHintOnCurrentQuestion
    });
    
    // 回答済み問題をカウント
    answeredQuestions++;
    
    // 章を完了としてマーク
    completedChapters.add(q.chapter);
}

// ヒント表示
function showHint() {
    const q = quizData[currentQuestion];
    
    // ヒントテキストの作成（正解の選択肢の一部を表示）
    let hintText = "";
    
    // ヒントの生成方法（例：正解の場合は最初の文字を表示）
    const correctAnswer = q.answer;
    const correctChoice = q.choices[correctAnswer];
    
    if (correctChoice) {
        hintText = `この問題のヒント：正解の選択肢は "${correctAnswer}" で始まります。`;
    } else {
        hintText = "ヒントを表示できません。";
    }
    
    // ヒントモーダルを表示
    document.getElementById('hint-text').textContent = hintText;
    hintModal.show();
    
    // ヒント使用のフラグを立てる
    usedHintOnCurrentQuestion = true;
    document.getElementById('hint-penalty').classList.remove('d-none');
}

// 次の問題へ
function nextQuestion() {
    currentQuestion++;
    
    if (currentQuestion < quizData.length) {
        // 新しい章かどうかチェック
        const nextChapter = quizData[currentQuestion].chapter;
        
        if (nextChapter !== lastChapter) {
            // 新しい章なら休憩画面を表示
            showBreakScreen(nextChapter);
        } else {
            // 同じ章なら次の問題へ
            showQuestion();
        }
    } else {
        // 全問終了
        showCompletion();
    }
}

// 章間休憩画面表示
function showBreakScreen(nextChapter) {
    // タイマーがあれば停止
    if (timer) {
        clearInterval(timer);
    }
    
    // クイズコンテナを隠す
    document.getElementById('quiz-container').classList.add('d-none');
    document.getElementById('explanation').classList.add('d-none');
    document.getElementById('next-button').classList.add('d-none');
    
    // 休憩画面を表示
    const breakScreen = document.getElementById('break-screen');
    breakScreen.classList.remove('d-none');
    
    // 章タイトルを設定
    document.getElementById('break-chapter').textContent = nextChapter;
    
    // ランダムな名言を表示
    const randomQuote = quotesData[Math.floor(Math.random() * quotesData.length)];
    document.getElementById('break-quote').textContent = randomQuote;
    
    // 最後の章を更新
    lastChapter = nextChapter;
    
    // プログレスバーをアニメーション
    const progressBar = document.getElementById('break-progress');
    progressBar.style.width = '0%';
    
    let progress = 0;
    const breakInterval = setInterval(() => {
        progress += 1;
        progressBar.style.width = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(breakInterval);
            // 続けるボタンを表示
            document.getElementById('continue-button').classList.remove('d-none');
        }
    }, 50); // 5秒で満タン
}

// クイズ完了画面表示
function showCompletion() {
    // タイマーがあれば停止
    if (timer) {
        clearInterval(timer);
    }
    
    // クイズコンテナを隠す
    document.getElementById('quiz-container').classList.add('d-none');
    document.getElementById('explanation').classList.add('d-none');
    document.getElementById('next-button').classList.add('d-none');
    document.getElementById('break-screen').classList.add('d-none');
    
    // 結果画面を表示
    document.getElementById('results-screen').classList.remove('d-none');
    
    // スコアを計算・表示
    const roundedScore = Math.round(score * 10) / 10; // 小数点第一位まで表示
    const percentage = Math.round((roundedScore / quizData.length) * 100);
    
    document.getElementById('final-score').textContent = 
        `${userName}さんのスコア: ${roundedScore}/${quizData.length} (${percentage}%)`;
    
    // パフォーマンスメッセージを設定
    let message = '';
    if (percentage >= 90) {
        message = '素晴らしい！あなたは愛の達人です！';
    } else if (percentage >= 70) {
        message = '良い結果です。愛の道をしっかり歩んでいます。';
    } else if (percentage >= 50) {
        message = 'まずまずの結果。もう少し愛について考えてみましょう。';
    } else {
        message = '愛の探求はこれからです。もう一度挑戦してみましょう。';
    }
    document.getElementById('performance-message').textContent = message;
    
    // 詳細結果の表示
    showDetailedResults();
    
    // アチーブメントの確認・表示
    checkAchievements();
    
    // ランキングの取得・表示
    fetchRankings();
    
    // 結果を保存
    saveResults(roundedScore);
}

// 詳細結果の表示
function showDetailedResults() {
    const detailsDiv = document.getElementById('score-details');
    detailsDiv.innerHTML = '';
    
    // 詳細結果のヘッダー
    const header = document.createElement('h5');
    header.textContent = '問題ごとの結果';
    detailsDiv.appendChild(header);
    
    // 結果テーブル
    const table = document.createElement('table');
    table.className = 'table table-sm';
    
    // テーブルヘッダー
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>問題</th>
            <th>あなたの回答</th>
            <th>正解</th>
            <th>結果</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // テーブルボディ
    const tbody = document.createElement('tbody');
    
    userAnswers.forEach((answer, index) => {
        const q = quizData.find(q => q.id === answer.questionId) || { question: `問題 ${index + 1}` };
        
        const row = document.createElement('tr');
        
        // 問題番号と質問の短縮版
        const questionCell = document.createElement('td');
        const shortQuestion = q.question.length > 30 ? q.question.substring(0, 30) + '...' : q.question;
        questionCell.textContent = `Q${answer.questionId}: ${shortQuestion}`;
        
        // ユーザーの回答
        const userAnswerCell = document.createElement('td');
        if (answer.userAnswer === '時間切れ') {
            userAnswerCell.textContent = '時間切れ';
            userAnswerCell.className = 'text-warning';
        } else {
            const userChoice = q.choices ? q.choices[answer.userAnswer] : answer.userAnswer;
            userAnswerCell.textContent = `${answer.userAnswer}: ${userChoice}`;
        }
        
        // 正解
        const correctAnswerCell = document.createElement('td');
        const correctChoice = q.choices ? q.choices[answer.correctAnswer] : answer.correctAnswer;
        correctAnswerCell.textContent = `${answer.correctAnswer}: ${correctChoice}`;
        
        // 結果
        const resultCell = document.createElement('td');
        if (answer.isCorrect) {
            resultCell.textContent = answer.usedHint ? '正解（ヒント使用）' : '正解';
            resultCell.className = answer.usedHint ? 'text-success fst-italic' : 'text-success';
        } else {
            resultCell.textContent = '不正解';
            resultCell.className = 'text-danger';
        }
        
        row.appendChild(questionCell);
        row.appendChild(userAnswerCell);
        row.appendChild(correctAnswerCell);
        row.appendChild(resultCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    detailsDiv.appendChild(table);
}

// アチーブメントの確認・表示
function checkAchievements() {
    // アチーブメントを表示する要素
    const achievementsContainer = document.getElementById('achievements-container');
    const achievementsList = document.getElementById('achievements-list');
    
    // 獲得したアチーブメントをクリア
    achievementsList.innerHTML = '';
    let earnedCount = 0;
    
    // アチーブメントの確認
    const roundedScore = Math.round(score * 10) / 10;
    const percentage = Math.round((roundedScore / quizData.length) * 100);
    
    // 各アチーブメントの条件をチェック
    achievementsData.forEach(achievement => {
        let earned = false;
        
        // 条件に基づいてアチーブメントを獲得したかチェック
        switch (achievement.title) {
            case "愛の初心者":
                earned = true; // 必ず獲得
                break;
            case "愛の探求者":
                earned = completedChapters.size >= 1; // 少なくとも1章をクリア
                break;
            case "愛の達人":
                earned = percentage >= 90; // 90%以上の正解率
                break;
            case "愛の哲学者":
                earned = answeredQuestions >= quizData.length; // 全ての問題に挑戦
                break;
            case "愛の瞑想者":
                earned = completedChapters.size > 1; // 複数章をクリア（休憩画面を見た）
                break;
            case "愛の迅速さ":
                earned = userAnswers.every(a => a.isCorrect) && !userAnswers.some(a => a.userAnswer === '時間切れ');
                break;
            case "愛の完全主義者":
                earned = roundedScore === quizData.length; // 全問正解
                break;
            default:
                earned = false;
        }
        
        // 獲得したアチーブメントを表示
        if (earned) {
            earnedCount++;
            const achievementCard = document.createElement('div');
            achievementCard.className = 'achievement-card animate__animated animate__flipInY';
            achievementCard.style.animationDelay = `${earnedCount * 0.2}s`;
            
            achievementCard.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-title">${achievement.title}</div>
                <div class="achievement-description">${achievement.description}</div>
            `;
            
            achievementsList.appendChild(achievementCard);
        }
    });
    
    // アチーブメントがあれば表示
    if (earnedCount > 0) {
        achievementsContainer.classList.remove('d-none');
    } else {
        achievementsContainer.classList.add('d-none');
    }
}

// 結果を保存
function saveResults(finalScore) {
    // 保存するデータ
    const resultData = {
        username: userName,
        score: finalScore,
        total: quizData.length,
        mode: quizMode,
        dailyChallenge: dailyChallengeMode,
        date: new Date().toISOString()
    };
    
    // サーバーに結果を保存
    fetch('/save_result', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(resultData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Result saved:', data);
        
        // 新しく獲得したアチーブメントがあれば表示
        if (data.achievements && data.achievements.length > 0) {
            // アチーブメントの表示を更新
            checkAchievements();
        }
    })
    .catch(error => {
        console.error('Error saving result:', error);
    });
}

// ランキングの取得・表示
function fetchRankings() {
    fetch('/get_results')
        .then(response => response.json())
        .then(data => {
            displayRankings(data);
        })
        .catch(error => {
            console.error('Error fetching rankings:', error);
        });
}

// ランキングの表示
function displayRankings(results) {
    const rankingsTable = document.getElementById('rankings-table');
    rankingsTable.innerHTML = '';
    
    // 結果をスコア順にソート
    const sortedResults = [...results].sort((a, b) => {
        return b.percentage - a.percentage || b.score - a.score || new Date(b.date) - new Date(a.date);
    });
    
    // 上位最大10件を表示
    const topResults = sortedResults.slice(0, 10);
    
    if (topResults.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">まだデータがありません</td>';
        rankingsTable.appendChild(row);
        return;
    }
    
    // ランキング表示
    topResults.forEach((result, index) => {
        const row = document.createElement('tr');
        
        // 現在のユーザーのスコアならハイライト
        if (result.username === userName && new Date(result.date).toDateString() === new Date().toDateString()) {
            row.className = 'table-primary';
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${result.username}</td>
            <td>${result.score}/${result.total} (${result.percentage}%)</td>
            <td>${formatDate(result.date)}</td>
        `;
        
        rankingsTable.appendChild(row);
    });
}

// シェアコンテンツの準備
function prepareShareContent() {
    const roundedScore = Math.round(score * 10) / 10;
    const percentage = Math.round((roundedScore / quizData.length) * 100);
    
    let shareText = `「愛のクイズ」で${userName}が${percentage}%のスコアを獲得しました！`;
    
    if (dailyChallengeMode) {
        shareText += '（日替わりチャレンジ）';
    }
    
    shareText += ' #愛のクイズ';
    
    document.getElementById('share-text').value = shareText;
}

// クイズのリスタート
function restartQuiz() {
    currentQuestion = 0;
    score = 0;
    answeredQuestions = 0;
    lastChapter = "";
    completedChapters.clear();
    userAnswers = [];
    
    document.getElementById('results-screen').classList.add('d-none');
    document.getElementById('quiz-container').classList.remove('d-none');
    
    showQuestion();
}

// クイズのリセット（ホーム画面に戻る）
function resetQuiz() {
    // すべての状態をリセット
    currentQuestion = 0;
    score = 0;
    answeredQuestions = 0;
    quizMode = 'normal';
    lastChapter = "";
    completedChapters.clear();
    userAnswers = [];
    dailyChallengeMode = false;
    
    // すべての画面を隠す
    document.getElementById('quiz-container').classList.add('d-none');
    document.getElementById('results-screen').classList.add('d-none');
    document.getElementById('break-screen').classList.add('d-none');
    document.getElementById('explanation').classList.add('d-none');
    document.getElementById('next-button').classList.add('d-none');
}

// ウェルカム画面の表示
function showWelcomeScreen() {
    document.getElementById('welcome-screen').classList.remove('d-none');
    
    // ラジオボタンをデフォルト（通常モード）に戻す
    document.getElementById('mode-normal').checked = true;
}

// 日付のフォーマット（YYYY-MM-DD HH:MM）
function formatDate(dateString) {
    const date = new Date(dateString);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// ダークモードトグルボタンを追加
function addDarkModeToggle() {
    // ダークモードの状態
    let isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // ボディにダークモードクラスを適用
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // トグルボタンの作成
    const toggleButton = document.createElement('div');
    toggleButton.className = 'dark-mode-toggle';
    toggleButton.innerHTML = isDarkMode ? '☀️' : '🌙';
    toggleButton.title = isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え';
    
    // クリックイベントの追加
    toggleButton.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        
        // ローカルストレージに保存
        localStorage.setItem('darkMode', isDarkMode);
        
        // ボディクラスの切り替え
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            toggleButton.innerHTML = '☀️';
            toggleButton.title = 'ライトモードに切り替え';
        } else {
            document.body.classList.remove('dark-mode');
            toggleButton.innerHTML = '🌙';
            toggleButton.title = 'ダークモードに切り替え';
        }
    });
    
    // ボディに追加
    document.body.appendChild(toggleButton);
}

// キーボードショートカットのイベントリスナー
document.addEventListener('keydown', (event) => {
    // 現在表示されている画面によって処理を分ける
    
    // ウェルカム画面の場合
    if (!document.getElementById('welcome-screen').classList.contains('d-none')) {
        // Enterキーでクイズスタート
        if (event.key === 'Enter') {
            startQuiz();
        }
    }
    // クイズ画面の場合
    else if (!document.getElementById('quiz-container').classList.contains('d-none')) {
        // 次へボタンが表示されている場合
        if (!document.getElementById('next-button').classList.contains('d-none')) {
            // Enterキーまたはスペースキーで次の問題へ
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); // スクロールを防止
                nextQuestion();
            }
        }
        // 問題回答中の場合
        else {
            // A,B,C,Dキーで選択肢を選択
            const choicesButtons = document.querySelectorAll('#choices button');
            if (choicesButtons.length > 0 && !choicesButtons[0].disabled) {
                if (event.key === 'a' || event.key === 'A') {
                    choicesButtons[0].click();
                } else if (event.key === 'b' || event.key === 'B' && choicesButtons.length > 1) {
                    choicesButtons[1].click();
                } else if (event.key === 'c' || event.key === 'C' && choicesButtons.length > 2) {
                    choicesButtons[2].click();
                } else if (event.key === 'd' || event.key === 'D' && choicesButtons.length > 3) {
                    choicesButtons[3].click();
                }
                // Hキーでヒント表示
                else if (event.key === 'h' || event.key === 'H') {
                    showHint();
                }
            }
        }
    }
    // 休憩画面の場合
    else if (!document.getElementById('break-screen').classList.contains('d-none')) {
        // 続けるボタンが表示されている場合
        if (!document.getElementById('continue-button').classList.contains('d-none')) {
            // Enterキーまたはスペースキーで続ける
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); // スクロールを防止
                document.getElementById('continue-button').click();
            }
        }
    }
    // 結果画面の場合
    else if (!document.getElementById('results-screen').classList.contains('d-none')) {
        // Rキーでリスタート
        if (event.key === 'r' || event.key === 'R') {
            restartQuiz();
        }
        // Hキーでホームに戻る
        else if (event.key === 'h' || event.key === 'H') {
            resetQuiz();
            showWelcomeScreen();
        }
        // Sキーでシェア
        else if (event.key === 's' || event.key === 'S') {
            prepareShareContent();
            shareModal.show();
        }
    }
});

// 音声効果の追加
function playSound(type) {
    // 音声ファイルが存在することを前提としています
    const audio = new Audio();
    
    switch (type) {
        case 'correct':
            audio.src = '/static/sounds/correct.mp3';
            break;
        case 'wrong':
            audio.src = '/static/sounds/wrong.mp3';
            break;
        case 'timeout':
            audio.src = '/static/sounds/timeout.mp3';
            break;
        case 'complete':
            audio.src = '/static/sounds/complete.mp3';
            break;
        case 'click':
            audio.src = '/static/sounds/click.mp3';
            break;
        default:
            return; // 不明なタイプは何もしない
    }
    
    audio.play().catch(error => {
        // 自動再生ポリシーのエラーなどを無視
        console.log('Audio play was prevented:', error);
    });
}

// PWA関連の設定
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/js/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// 接続状態の監視
window.addEventListener('online', () => {
    // オンラインになったときの処理
    showToast('インターネット接続が回復しました');
});

window.addEventListener('offline', () => {
    // オフラインになったときの処理
    showToast('インターネット接続が切断されました。一部機能が制限されます', 'warning');
});

// トースト通知の表示
function showToast(message, type = 'info') {
    // トースト要素がなければ作成
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
    }
    
    // トーストの作成
    const toastId = `toast-${new Date().getTime()}`;
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast show bg-${type}`;
    toast.role = 'alert';
    toast.ariaLive = 'assertive';
    toast.ariaAtomic = 'true';
    
    toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">愛のクイズ</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body text-white">
            ${message}
        </div>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // 5秒後に自動的に閉じる
    setTimeout(() => {
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
            toastElement.remove();
        }
    }, 5000);
    
    // 閉じるボタンのイベント
    toast.querySelector('.btn-close').addEventListener('click', () => {
        toast.remove();
    });
}

// 初回訪問かどうかを確認してチュートリアルを表示
function checkFirstVisit() {
    if (!localStorage.getItem('hasVisited')) {
        // 初回訪問時の処理
        showTutorial();
        localStorage.setItem('hasVisited', 'true');
    }
}

// チュートリアルの表示
function showTutorial() {
    // チュートリアルのHTMLを作成して表示
    const tutorialHTML = `
        <div class="modal fade" id="tutorial-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">愛のクイズへようこそ！</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="tutorial-carousel" class="carousel slide" data-bs-ride="carousel">
                            <div class="carousel-inner">
                                <div class="carousel-item active">
                                    <div class="d-flex justify-content-center align-items-center" style="height: 300px;">
                                        <div class="text-center p-4">
                                            <h4>愛のクイズとは？</h4>
                                            <p>哲学的な「愛」について考えながら学べるクイズアプリです。</p>
                                            <p>深遠な問いに向き合い、自分自身と向き合うきっかけになるでしょう。</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="carousel-item">
                                    <div class="d-flex justify-content-center align-items-center" style="height: 300px;">
                                        <div class="text-center p-4">
                                            <h4>遊び方</h4>
                                            <p>1. モードを選んでクイズをスタート</p>
                                            <p>2. 問題に答えて、解説を読む</p>
                                            <p>3. 章ごとの休憩を楽しむ</p>
                                            <p>4. 結果を確認し、アチーブメントを獲得</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="carousel-item">
                                    <div class="d-flex justify-content-center align-items-center" style="height: 300px;">
                                        <div class="text-center p-4">
                                            <h4>キーボードショートカット</h4>
                                            <p>A, B, C, D: 選択肢を選ぶ</p>
                                            <p>H: ヒントを表示</p>
                                            <p>Enter/Space: 次へ進む</p>
                                            <p>R: リスタート（結果画面で）</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button class="carousel-control-prev" type="button" data-bs-target="#tutorial-carousel" data-bs-slide="prev">
                                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                <span class="visually-hidden">Previous</span>
                            </button>
                            <button class="carousel-control-next" type="button" data-bs-target="#tutorial-carousel" data-bs-slide="next">
                                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                <span class="visually-hidden">Next</span>
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">始める</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // モーダルをDOMに追加
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = tutorialHTML;
    document.body.appendChild(tempDiv.firstElementChild);
    
    // モーダルを表示
    const tutorialModal = new bootstrap.Modal(document.getElementById('tutorial-modal'));
    tutorialModal.show();
}

// 初回訪問チェックを実行
checkFirstVisit();