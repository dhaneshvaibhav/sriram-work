from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.services.hf_service import HFService

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Initialize configuration
    Config.init_app(app)
    
    # Authenticate HF
    HFService.authenticate()
    
    # Register Blueprints
    from app.routes.bucket_routes import bucket_bp
    from app.routes.file_routes import file_bp
    app.register_blueprint(bucket_bp, url_prefix='/api/bucket')
    app.register_blueprint(file_bp, url_prefix='/api/file')
    
    @app.route('/')
    def health_check():
        return jsonify({
            "status": "running",
            "hf_authenticated": bool(Config.HF_TOKEN)
        })
        
    return app
