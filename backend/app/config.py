import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT = int(os.getenv('PORT', 5000))
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
    ALLOWED_EXTENSIONS = {'*'}  # Allow all extensions
    HF_TOKEN = os.getenv('HF_TOKEN')
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB limit

    @staticmethod
    def init_app(app):
        if not os.path.exists(Config.UPLOAD_FOLDER):
            os.makedirs(Config.UPLOAD_FOLDER)
