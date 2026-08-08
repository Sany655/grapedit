import os
import time
from dotenv import load_dotenv
from huggingface_hub import HfApi, hf_hub_download

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))
HF_TOKEN = os.getenv("HF_TOKEN")
REPO_ID = "player123c/grapedit-backend"

api = HfApi(token=HF_TOKEN)

print("Downloading README.md to update SDK to Docker...")
try:
    readme_path = hf_hub_download(repo_id=REPO_ID, filename="README.md", repo_type="space", token=HF_TOKEN)
    with open(readme_path, "r") as f:
        readme_content = f.read()
    
    # Replace sdk: gradio with sdk: docker
    new_readme_content = readme_content.replace("sdk: gradio", "sdk: docker")
    
    with open("README.md", "w") as f:
        f.write(new_readme_content)
    
    print("Pushing README.md...")
    api.upload_file(path_or_fileobj="README.md", path_in_repo="README.md", repo_id=REPO_ID, repo_type="space")
except Exception as e:
    print("Could not update README.md automatically:", e)

print("Pushing Dockerfile, app.py, and requirements.txt...")
for file in ["Dockerfile", "app.py", "requirements.txt"]:
    api.upload_file(path_or_fileobj=file, path_in_repo=file, repo_id=REPO_ID, repo_type="space")

print("\nPush successful! Waiting for Docker build...")

while True:
    info = api.space_info(repo_id=REPO_ID)
    status = info.runtime.stage
    print("Current Status:", status)
    if status == "RUNNING":
        print("SUCCESS!")
        break
    elif "ERROR" in status:
        print("FAILED!")
        break
    time.sleep(5)
