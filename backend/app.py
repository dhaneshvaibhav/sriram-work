import os
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
PORT = int(os.getenv('PORT', 5000))
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'wmv', 'mkv'}

# Ensure upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def health_check():
    return "Backend is running! (Python/Flask)"

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'video' not in request.files:
        return jsonify({"message": "No file uploaded"}), 400
    
    file = request.files['video']
    
    if file.filename == '':
        return jsonify({"message": "No file selected"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to avoid collisions
        unique_filename = f"{int(time.time())}-{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        return jsonify({
            "message": "Video uploaded successfully",
            "file": {
                "name": filename,
                "url": f"/uploads/{unique_filename}"
            }
        }), 200
    
    return jsonify({"message": "Only videos are allowed!"}), 400

@app.route('/api/videos', methods=['GET'])
def get_videos():
    try:
        files = os.listdir(app.config['UPLOAD_FOLDER'])
        videos = []
        for file in files:
            # Reconstruct original name by removing timestamp prefix
            # split('-', 1) handles filenames with hyphens correctly
            parts = file.split('-', 1)
            original_name = parts[1] if len(parts) > 1 else file
            
            videos.append({
                "id": file,
                "name": original_name,
                "url": f"/uploads/{file}"
            })
        return jsonify(videos), 200
    except Exception as e:
        return jsonify({"message": "Unable to scan files"}), 500

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    print(f"Server is running on port {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
