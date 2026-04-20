"""
wsgi.py — точка входа для gunicorn и локального запуска.
Логика вынесена в пакет core/.
"""
from core import create_app
import os

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
