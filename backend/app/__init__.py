from flask import Flask, jsonify, send_from_directory
import os
from flask_cors import CORS
from app.config import Config
from app.services.hf_service import HFService

def create_app():
    # Set up static folder to serve the frontend
    # In production (Docker), the dist will be in /app/frontend_dist
    static_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend_dist')
    
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
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
    def serve_frontend():
        if os.path.exists(os.path.join(app.static_folder, 'index.html')):
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({
            "status": "backend running",
            "frontend": "not found in static_folder",
            "hf_authenticated": bool(Config.HF_TOKEN)
        })

    @app.errorhandler(404)
    def not_found(e):
        # Redirect all 404s to frontend index.html for SPA support
        if os.path.exists(os.path.join(app.static_folder, 'index.html')):
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({"error": "Not Found"}), 404
        
    return app
