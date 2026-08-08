import os
import time
from dotenv import load_dotenv
from huggingface_hub import HfApi

# Load environment variables from ../.env.local
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

HF_TOKEN = os.getenv("HF_TOKEN")
REPO_ID = "player123c/grapedit-backend"

if not HF_TOKEN:
    print("Error: HF_TOKEN not found in .env.local")
    exit(1)

api = HfApi(token=HF_TOKEN)

print(f"Pushing app.py and requirements.txt to {REPO_ID}...")

# Upload files individually to avoid pushing the deploy script itself
api.upload_file(
    path_or_fileobj="app.py",
    path_in_repo="app.py",
    repo_id=REPO_ID,
    repo_type="space"
)

api.upload_file(
    path_or_fileobj="requirements.txt",
    path_in_repo="requirements.txt",
    repo_id=REPO_ID,
    repo_type="space"
)

print("\nPush successful! Waiting for Hugging Face to build and start the Space...\n")

# Track logs / status
while True:
    info = api.space_info(repo_id=REPO_ID)
    status = info.runtime.stage
    print(f"Current Status: {status}")
    
    if status == "RUNNING":
        print("\n✅ SUCCESS: The backend is fully running and green!")
        break
    elif status == "RUNTIME_ERROR":
        print("\n❌ ERROR: Space encountered a runtime error!")
        break
    elif status == "BUILD_ERROR":
        print("\n❌ ERROR: Space encountered a build error!")
        break
        
    time.sleep(5)
