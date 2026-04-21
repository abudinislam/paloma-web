"""
PalomaBot Web — веб-сервис для парсинга накладных
Flask + Claude API → xlsx для Paloma365
"""
import os
from flask import Flask
from extensions import db, limiter

CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "")
if not CLAUDE_API_KEY:
    raise RuntimeError("CLAUDE_API_KEY не задан. Установи переменную окружения перед запуском.")

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///paloma.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
limiter.init_app(app)

from routes import bp  # noqa: E402 — после инициализации app
app.register_blueprint(bp)

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
