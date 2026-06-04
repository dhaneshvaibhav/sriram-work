from flask import Blueprint, request, jsonify, send_from_directory
import os
from app.config import Config
from app.services.hf_service import HFService
from werkzeug.utils import secure_filename
import time

file_bp = Blueprint('file', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@file_bp.route('/upload', methods=['POST'])
def upload_file():
    """
    Endpoint to upload a file locally and optionally to a HF Bucket.
    Expects multipart/form-data with 'video' file.
    Optional form fields: 'bucket_id', 'path_in_repo'
    """
    if 'video' not in request.files:
        return jsonify({"message": "No file uploaded"}), 400
    
    file = request.files['video']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"message": "Invalid file"}), 400
    
    bucket_id = request.form.get('bucket_id')
    path_in_repo = request.form.get('path_in_repo')
    
    filename = secure_filename(file.filename)
    unique_filename = f"{int(time.time())}-{filename}"
    local_path = os.path.join(Config.UPLOAD_FOLDER, unique_filename)
    file.save(local_path)
    
    response_data = {
        "message": "File uploaded locally",
        "filename": unique_filename,
        "local_path": local_path
    }

    # If bucket_id is provided, upload to HF Bucket
    if bucket_id:
        if not Config.HF_TOKEN:
            return jsonify({"message": "HF_TOKEN not configured for bucket upload"}), 500
        
        try:
            target_path = path_in_repo if path_in_repo else unique_filename
            HFService.upload_files(bucket_id, [(local_path, target_path)])
            response_data["message"] = "File uploaded locally and to HF Bucket"
            response_data["bucket_id"] = bucket_id
            response_data["path_in_repo"] = target_path
        except Exception as e:
            print(f"Error uploading to bucket: {e}")
            return jsonify({"message": f"Local upload success, but HF Bucket upload failed: {str(e)}"}), 500
    
    return jsonify(response_data), 200

@file_bp.route('/list', methods=['GET'])
def list_files():
    files = os.listdir(Config.UPLOAD_FOLDER)
    return jsonify(files), 200

@file_bp.route('/bucket/list', methods=['GET'])
def list_bucket_files():
    """
    Endpoint to list files in a Hugging Face Storage Bucket.
    Expects query parameters: ?bucket_id=string&recursive=boolean&prefix=string
    """
    if not Config.HF_TOKEN:
        return jsonify({"message": "HF_TOKEN not configured"}), 500

    bucket_id = request.args.get('bucket_id')
    if not bucket_id:
        return jsonify({"message": "bucket_id is required"}), 400

    recursive = request.args.get('recursive', 'true').lower() == 'true'
    prefix = request.args.get('prefix')

    try:
        items = HFService.list_bucket_files(bucket_id, recursive=recursive, prefix=prefix)
        
        result = []
        for item in items:
            result.append({
                "path": item.path,
                "size": item.size,
                "type": item.type,
                "last_modified": item.last_modified.isoformat() if hasattr(item, 'last_modified') and item.last_modified else None
            })
        
        return jsonify(result), 200
    except Exception as e:
        print(f"Error listing bucket files: {e}")
        return jsonify({"message": str(e)}), 500

@file_bp.route('/bucket/upload-batch', methods=['POST'])
def upload_batch_files():
    """
    Endpoint for batch uploading files to a HF Bucket.
    Expects JSON: { "bucket_id": "string", "add": [ ["local_path", "repo_path"], ... ] }
    """
    if not Config.HF_TOKEN:
        return jsonify({"message": "HF_TOKEN not configured"}), 500

    data = request.json or {}
    bucket_id = data.get('bucket_id')
    add_list = data.get('add')

    if not bucket_id or not add_list:
        return jsonify({"message": "bucket_id and add (list of tuples) are required"}), 400

    try:
        HFService.upload_files(bucket_id, add_list)
        return jsonify({"message": f"Successfully initiated batch upload of {len(add_list)} files to {bucket_id}"}), 200
    except Exception as e:
        print(f"Error in batch upload: {e}")
        return jsonify({"message": str(e)}), 500

@file_bp.route('/bucket/download', methods=['POST'])
def download_bucket_files():
    """
    Endpoint to download files from a Hugging Face Storage Bucket.
    Expects JSON: { "bucket_id": "string", "files": [ ["path_in_repo", "local_path"], ... ] }
    """
    if not Config.HF_TOKEN:
        return jsonify({"message": "HF_TOKEN not configured"}), 500

    data = request.json or {}
    bucket_id = data.get('bucket_id')
    files_to_download = data.get('files')

    if not bucket_id or not files_to_download:
        return jsonify({"message": "bucket_id and files (list of tuples) are required"}), 400

    try:
        # Resolve local paths relative to UPLOAD_FOLDER if they are not absolute
        resolved_files = []
        for repo_path, local_path in files_to_download:
            if not os.path.isabs(local_path):
                local_path = os.path.join(Config.UPLOAD_FOLDER, local_path)
            resolved_files.append((repo_path, local_path))

        HFService.download_files(bucket_id, resolved_files)
        return jsonify({"message": f"Successfully downloaded {len(resolved_files)} files from {bucket_id}"}), 200
    except Exception as e:
        print(f"Error downloading files: {e}")
        return jsonify({"message": str(e)}), 500

@file_bp.route('/serve/<path:filename>')
def serve_file(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)

@file_bp.route('/delete', methods=['POST'])
def delete_bucket_files():
    """
    Endpoint to delete files from a Hugging Face Storage Bucket.
    Expects JSON: { "bucket_id": "string", "files": ["file1", "file2"] }
    """
    if not Config.HF_TOKEN:
        return jsonify({"message": "HF_TOKEN not configured"}), 500

    data = request.json or {}
    bucket_id = data.get('bucket_id')
    files = data.get('files')

    if not bucket_id or not files:
        return jsonify({"message": "bucket_id and files (list) are required"}), 400

    if not isinstance(files, list):
        return jsonify({"message": "files must be a list of strings"}), 400

    try:
        HFService.delete_files(bucket_id, files)
        return jsonify({"message": f"Successfully requested deletion of {len(files)} files from {bucket_id}"}), 200
    except Exception as e:
        print(f"Error deleting files: {e}")
        return jsonify({"message": str(e)}), 500
