import os
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from huggingface_hub import create_bucket, bucket_info, login

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
PORT = int(os.getenv('PORT', 5000))
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'wmv', 'mkv'}
HF_TOKEN = os.getenv('HF_TOKEN')

# Authenticate with Hugging Face if token is provided
if HF_TOKEN:
    try:
        login(token=HF_TOKEN)
        print("Authenticated with Hugging Face")
    except Exception as e:
        print(f"Authentication failed: {e}")

# Ensure upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/bucket/create', methods=['POST'])
def create_hf_bucket():
    """
    Endpoint to create a Hugging Face Storage Bucket.
    Expects JSON: { "bucket_name": "string", "private": boolean, "region": "string" }
    """
    if not HF_TOKEN:
        return jsonify({"message": "HF_TOKEN not configured in environment"}), 500

    data = request.json or {}
    bucket_name = data.get('bucket_name')
    is_private = data.get('private', False)
    region = data.get('region')

    if not bucket_name:
        return jsonify({"message": "bucket_name is required"}), 400

    try:
        # Create the bucket using huggingface_hub
        # exist_ok=True prevents error if bucket already exists
        url = create_bucket(
            bucket_name, 
            private=is_private, 
            region=region, 
            exist_ok=True
        )
        
        return jsonify({
            "message": "Bucket created or already exists",
            "bucket_id": url.bucket_id,
            "uri": url.uri.to_uri(),
            "url": str(url)
        }), 200
        
    except Exception as e:
        print(f"Error creating bucket: {e}")
        return jsonify({"message": f"Failed to create bucket: {str(e)}"}), 500

@app.route('/api/bucket/info', methods=['GET'])
def get_bucket_info():
    """
    Endpoint to get metadata about a Hugging Face Storage Bucket.
    Expects query parameter: ?bucket_id=username/bucket-name
    """
    if not HF_TOKEN:
        return jsonify({"message": "HF_TOKEN not configured in environment"}), 500

    bucket_id = request.args.get('bucket_id')

    if not bucket_id:
        return jsonify({"message": "bucket_id is required as a query parameter"}), 400

    try:
        info = bucket_info(bucket_id)
        
        return jsonify({
            "id": info.id,
            "private": info.private,
            "created_at": info.created_at.isoformat() if info.created_at else None,
            "size": info.size,
            "total_files": info.total_files
        }), 200
        
    except Exception as e:
        print(f"Error getting bucket info: {e}")
        return jsonify({"message": f"Failed to get bucket info: {str(e)}"}), 500

@app.route('/')
def health_check():
    return jsonify({
        "status": "running",
        "hf_authenticated": bool(HF_TOKEN)
    })

if __name__ == '__main__':
    print(f"Server is running on port {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
