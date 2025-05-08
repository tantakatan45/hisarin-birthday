from flask import Flask, render_template, jsonify
import json
import os

app = Flask(__name__)

# クイズデータの読み込み（JSONファイル）
QUIZ_FILE = os.path.join(os.path.dirname(__file__), 'quiz_data.json')

with open(QUIZ_FILE, 'r', encoding='utf-8') as f:
    quiz_data = json.load(f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/quiz')
def get_quiz():
    return jsonify(quiz_data)

if __name__ == '__main__':
    app.run(debug=True)
