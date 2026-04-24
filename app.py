"""PalomaBot Web — веб-сервис для парсинга накладных
Flask + Claude API → xlsx для Paloma365
"""
import os
from flask import Flask
from extensions import db

CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "")
if not CLAUDE_API_KEY:
    raise RuntimeError("CLAUDE_API_KEY не задан. Установи переменную окружения перед запуском.")

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///paloma.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

from routes import bp  # noqa: E402
app.register_blueprint(bp)

with app.app_context():
    db.create_all()
    # Миграция: добавляем key_id если его ещё нет (для существующих БД)
    with db.engine.connect() as conn:
        try:
            conn.execute(db.text('ALTER TABLE invoice ADD COLUMN key_id INTEGER REFERENCES access_key(id)'))
            conn.commit()
        except Exception:
            pass  # столбец уже существует
    from models import AccessKey
    app_password = os.environ.get('APP_PASSWORD', '')
    if app_password and not AccessKey.query.first():
        db.session.add(AccessKey(
            key_hash=AccessKey.hash(app_password),
            label='Default',
            monthly_limit=100,
        ))
        db.session.commit()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
