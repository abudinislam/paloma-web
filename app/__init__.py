from flask import Flask
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

def create_app():
    app = Flask(__name__, template_folder='../templates')
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB

    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://",
    )

    from .routes import register_routes
    register_routes(app, limiter)

    return app
