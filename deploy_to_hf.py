import os
from huggingface_hub import HfApi, create_repo
from dotenv import load_dotenv

# Load local .env for the token
load_dotenv(os.path.join('backend', '.env'))

def deploy():
    token = os.getenv('HF_TOKEN')
    if not token:
        print("Error: HF_TOKEN not found in backend/.env")
        return

    api = HfApi(token=token)
    
    # Get user info to construct repo ID
    user = api.whoami()
    username = user['name']
    
    space_name = input(f"Enter the name for your HF Space (default: gate-video-vault): ") or "gate-video-vault"
    repo_id = f"{username}/{space_name}"

    print(f"Creating/Checking Space: {repo_id}...")
    try:
        create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            private=True,
            exist_ok=True
        )
    except Exception as e:
        print(f"Note: {e}")

    print(f"Uploading files to {repo_id}...")
    # Upload everything except ignored files
    api.upload_folder(
        folder_path=".",
        repo_id=repo_id,
        repo_type="space",
        ignore_patterns=[
            "**/node_modules/**",
            "**/__pycache__/**",
            "**/.git/**",
            "**/uploads/**",
            "**/venv/**",
            "backend/.env",
            "gate video storage/.env"
        ]
    )

    print("\n" + "="*50)
    print(f"SUCCESS! Your app is deploying to:")
    print(f"https://huggingface.co/spaces/{repo_id}")
    print("="*50)
    print("\nIMPORTANT: Go to the Space Settings -> Variables and Secrets")
    print(f"and add a Secret named 'HF_TOKEN' with your token value.")

if __name__ == "__main__":
    deploy()
