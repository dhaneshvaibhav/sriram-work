from flask import Blueprint, request, jsonify
from app.services.hf_service import HFService
from app.config import Config

bucket_bp = Blueprint('bucket', __name__)

@bucket_bp.route('/create', methods=['POST'])
def create_hf_bucket():
    if not Config.HF_TOKEN:
        return jsonify({"message": "HF_TOKEN not configured"}), 500

    data = request.json or {}
    bucket_name = data.get('bucket_name')
    is_private = data.get('private', False)
    region = data.get('region')

    if not bucket_name:
        return jsonify({"message": "bucket_name is required"}), 400

    try:
        url = HFService.create_bucket(bucket_name, private=is_private, region=region)
        return jsonify({
            "message": "Bucket created or already exists",
            "bucket_id": url.bucket_id,
            "uri": url.uri.to_uri(),
            "url": str(url)
        }), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@bucket_bp.route('/info', methods=['GET'])
def get_bucket_info():
    if not Config.HF_TOKEN:
        return jsonify({"message": "HF_TOKEN not configured"}), 500

    bucket_id = request.args.get('bucket_id')
    if not bucket_id:
        return jsonify({"message": "bucket_id is required"}), 400

    try:
        info = HFService.get_bucket_info(bucket_id)
        return jsonify({
            "id": info.id,
            "private": info.private,
            "created_at": info.created_at.isoformat() if info.created_at else None,
            "size": info.size,
            "total_files": info.total_files
        }), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@bucket_bp.route('/list', methods=['GET'])
def list_hf_buckets():
    if not Config.HF_TOKEN:
        return jsonify({"message": "HF_TOKEN not configured"}), 500

    namespace = request.args.get('namespace')
    try:
        buckets = HFService.list_buckets(namespace=namespace)
        return jsonify([{
            "id": b.id,
            "private": b.private,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "size": b.size,
            "total_files": b.total_files
        } for b in buckets]), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@bucket_bp.route('/delete', methods=['DELETE'])
def delete_hf_bucket():
    if not Config.HF_TOKEN:
        return jsonify({"message": "HF_TOKEN not configured"}), 500

    bucket_id = request.args.get('bucket_id')
    if not bucket_id:
        return jsonify({"message": "bucket_id is required"}), 400

    try:
        HFService.delete_bucket(bucket_id)
        return jsonify({"message": f"Bucket {bucket_id} deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
