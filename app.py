from flask import Flask, render_template, jsonify, request, session
import json
import os
import pandas as pd
import random
from datetime import datetime

app = Flask(__name__)
app.secret_key = "love_quiz_secret_key"  # セッション用の秘密鍵

# クイズデータの読み込み（JSONファイル）
QUIZ_FILE = os.path.join(os.path.dirname(__file__), 'quiz_data.json')

try:
    with open(QUIZ_FILE, 'r', encoding='utf-8') as f:
        quiz_data = json.load(f)
except FileNotFoundError:
    # JSONファイルがない場合はCSVからデータを生成
    try:
        CSV_FILE = os.path.join(os.path.dirname(__file__), 'data', 'quiz_data_sample.csv')
        
        # CSVを読み込む
        df = pd.read_csv(CSV_FILE)
        
        # JSONデータに変換
        quiz_data = []
        for _, row in df.iterrows():
            quiz_item = {
                "id": int(row['id']),
                "chapter": row['chapter'],
                "chapter_subtitle": row['chapter_subtitle'],
                "question": row['question'],
                "choices": {
                    "A": row['choices_A'],
                    "B": row['choices_B'],
                    "C": row['choices_C'],
                    "D": row['choices_D']
                },
                "answer": row['answer'],
                "answer_explanation": row['answer_explanation'],
                "wrong_explanations": {
                    "B": row['wrong_explanations_B'],
                    "C": row['wrong_explanations_C'],
                    "D": row['wrong_explanations_D']
                }
            }
            quiz_data.append(quiz_item)
            
        # JSONに保存しておく（オプション）
        with open(QUIZ_FILE, 'w', encoding='utf-8') as f:
            json.dump(quiz_data, f, ensure_ascii=False, indent=4)
    except FileNotFoundError:
        # サンプルデータも見つからない場合はデフォルトデータを使用
        quiz_data = [
            {
                "id": 1,
                "chapter": "第1章",
                "chapter_subtitle": "愛とは何か",
                "question": "愛について最も適切な表現は？",
                "choices": {
                    "A": "与えること",
                    "B": "受け取ること",
                    "C": "感情",
                    "D": "運命"
                },
                "answer": "A",
                "answer_explanation": "愛とは、相手から何かを得ようとするのではなく、自分から与えることから始まります。",
                "wrong_explanations": {
                    "B": "受け取ることは愛の結果であり、本質ではありません。",
                    "C": "感情は愛の一部ですが、愛はそれ以上のものです。",
                    "D": "運命は愛の始まりかもしれませんが、愛そのものではありません。"
                }
            }
        ]

# 名言のリスト
QUOTES = [
    "「愛とは、自己という牢獄からの解放である」 - エーリッヒ・フロム",
    "「愛は、時間の贈り物である」 - アンドレ・モーロワ",
    "「美は見る人の目の中にある」 - オスカー・ワイルド",
    "「愛することは理解することである」 - ティク・ナット・ハン",
    "「真の愛は自分自身を知ることから始まる」 - ソクラテス",
    "「愛は与えることによって豊かになる唯一のものである」 - マザー・テレサ",
    "「完全な愛は恐れを追い出す」 - ヨハネの手紙",
    "「愛は時間という概念を超越する」 - ヘンリー・デイヴィッド・ソロー",
    "「愛が存在するところに生命がある」 - マハトマ・ガンジー",
    "「愛とは2人の孤独が出会い、お互いを尊重し、守り合うことである」 - レイナー・マリア・リルケ"
]

# アチーブメントのリスト
ACHIEVEMENTS = [
    {"title": "愛の初心者", "description": "最初のクイズに挑戦", "icon": "🌱"},
    {"title": "愛の探求者", "description": "全ての章をクリア", "icon": "🔍"},
    {"title": "愛の達人", "description": "90%以上の正解率を達成", "icon": "🏆"},
    {"title": "愛の哲学者", "description": "全ての問題に挑戦", "icon": "🧠"},
    {"title": "愛の継続者", "description": "3日連続でクイズに挑戦", "icon": "📆"},
    {"title": "愛の瞑想者", "description": "各章間で休憩時間を楽しむ", "icon": "🧘"},
    {"title": "愛の迅速さ", "description": "時間内に全問正解", "icon": "⏱️"},
    {"title": "愛の完全主義者", "description": "全問正解を達成", "icon": "💯"}
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/quiz')
def get_quiz():
    # セッションに保存されたユーザー名を取得
    username = session.get('username', '')
    
    # クイズデータと一緒にその他の情報も返す
    response_data = {
        "quiz_data": quiz_data,
        "quotes": QUOTES,
        "achievements": ACHIEVEMENTS,
        "username": username
    }
    
    return jsonify(response_data)

@app.route('/save_result', methods=['POST'])
def save_result():
    data = request.json
    username = data.get('username', 'ゲスト')
    score = data.get('score', 0)
    total = data.get('total', 0)
    date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # ユーザー名をセッションに保存
    session['username'] = username
    
    # 実際のアプリケーションではここでデータベースに結果を保存する
    # この例ではセッションに保存する簡易的な方法を使用
    if 'results' not in session:
        session['results'] = []
    
    session['results'].append({
        'username': username,
        'score': score,
        'total': total,
        'percentage': round((score / total) * 100),
        'date': date
    })
    
    # アチーブメントを確認
    achievements_earned = check_achievements(username, score, total)
    
    return jsonify({
        'status': 'success',
        'achievements': achievements_earned
    })

@app.route('/get_results')
def get_results():
    results = session.get('results', [])
    return jsonify(results)

@app.route('/daily_challenge')
def daily_challenge():
    # 日替わりチャレンジ - ランダムに3問選ぶ
    if len(quiz_data) >= 3:
        daily_questions = random.sample(quiz_data, 3)
    else:
        daily_questions = quiz_data
    
    return jsonify(daily_questions)

def check_achievements(username, score, total):
    # アチーブメントを確認して返す処理
    # 実際のアプリケーションではデータベースを使って保存・照会する
    earned = []
    
    # 愛の初心者
    earned.append(ACHIEVEMENTS[0])
    
    # 愛の達人（90%以上の正解率）
    if (score / total) >= 0.9:
        earned.append(ACHIEVEMENTS[2])
    
    # 愛の完全主義者（全問正解）
    if score == total:
        earned.append(ACHIEVEMENTS[7])
    
    return earned

if __name__ == '__main__':
    app.run(debug=True)