from huggingface_hub import create_bucket, bucket_info, list_buckets, delete_bucket, batch_bucket_files, list_bucket_tree, download_bucket_files, login
from app.config import Config

class HFService:
    @staticmethod
    def authenticate():
        if Config.HF_TOKEN:
            try:
                login(token=Config.HF_TOKEN)
                return True
            except Exception as e:
                print(f"Authentication failed: {e}")
        return False

    @staticmethod
    def create_bucket(name, private=False, region=None):
        return create_bucket(name, private=private, region=region, exist_ok=True)

    @staticmethod
    def get_bucket_info(bucket_id):
        return bucket_info(bucket_id)

    @staticmethod
    def list_buckets(namespace=None):
        return list_buckets(namespace=namespace)

    @staticmethod
    def delete_bucket(bucket_id):
        return delete_bucket(bucket_id, missing_ok=True)

    @staticmethod
    def delete_files(bucket_id, files):
        """
        Delete specific files from a bucket.
        :param bucket_id: The ID of the bucket.
        :param files: A list of file paths to delete.
        """
        return batch_bucket_files(bucket_id, delete=files)

    @staticmethod
    def list_bucket_files(bucket_id, recursive=True, prefix=None):
        """
        List files and directories in a bucket.
        :param bucket_id: The ID of the bucket.
        :param recursive: Whether to list files recursively.
        :param prefix: Optional prefix to filter by.
        """
        return list_bucket_tree(bucket_id, recursive=recursive, prefix=prefix)

    @staticmethod
    def upload_files(bucket_id, files_to_add):
        """
        Upload files to a bucket.
        :param bucket_id: The ID of the bucket.
        :param files_to_add: A list of tuples (local_path_or_bytes, path_in_repo).
        """
        return batch_bucket_files(bucket_id, add=files_to_add)

    @staticmethod
    def download_files(bucket_id, files_to_download):
        """
        Download files from a bucket.
        :param bucket_id: The ID of the bucket.
        :param files_to_download: A list of tuples (path_in_repo, local_path).
        """
        return download_bucket_files(bucket_id, files=files_to_download)
