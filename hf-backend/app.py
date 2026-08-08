import gradio as gr
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import subprocess
import time
import threading

# Ensure directories
UPLOADS_DIR = "/tmp/uploads"
RENDERED_DIR = "/tmp/rendered"
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(RENDERED_DIR, exist_ok=True)

# Create FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Grapedit Backend Running"}

@app.post("/upload")
async def upload_video(video: UploadFile = File(...)):
    ext = os.path.splitext(video.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(await video.read())
    return {"success": True, "filename": filename, "url": f"/uploads/{filename}"}

@app.get("/uploads/{filename}")
def get_upload(filename: str):
    return FileResponse(os.path.join(UPLOADS_DIR, filename))

@app.get("/rendered/{filename}")
def get_rendered(filename: str):
    return FileResponse(os.path.join(RENDERED_DIR, filename))

@app.post("/render")
async def render_video(request: Request):
    data = await request.json()
    segments = data.get("segments", [])
    export_name = data.get("exportName", "export")
    
    if not segments:
        return JSONResponse({"error": "No segments provided"}, status_code=400)
        
    job_id = str(uuid.uuid4())
    output_filename = f"{export_name}_{job_id}.mp4"
    output_path = os.path.join(RENDERED_DIR, output_filename)
    
    list_file_path = os.path.join(RENDERED_DIR, f"concat_list_{job_id}.txt")
    concat_lines = []
    temp_files = []
    
    try:
        for i, seg in enumerate(segments):
            source_file = seg["sourceFile"]
            source_path = os.path.join(UPLOADS_DIR, source_file)
            
            if not os.path.exists(source_path):
                raise Exception(f"Source file not found: {source_file}")
                
            temp_seg_path = os.path.join(RENDERED_DIR, f"seg_{job_id}_{i}.mp4")
            temp_files.append(temp_seg_path)
            
            # Extract segment using subprocess
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(seg["sourceStart"]),
                "-i", source_path,
                "-t", str(seg["duration"]),
                "-c", "copy",
                temp_seg_path
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            concat_lines.append(f"file '{temp_seg_path}'\n")
            
        with open(list_file_path, "w") as f:
            f.writelines(concat_lines)
            
        # Concat all segments
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_file_path,
            "-c", "copy",
            output_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Cleanup
        os.remove(list_file_path)
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
        return {"success": True, "jobId": job_id, "url": f"/rendered/{output_filename}"}
        
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
        return JSONResponse({"error": "Render failed", "details": e.stderr.decode()}, status_code=500)
    except Exception as e:
        print(f"Render error: {str(e)}")
        return JSONResponse({"error": "Render failed", "details": str(e)}, status_code=500)

# Cleanup thread
def cleanup_old_files():
    ONE_DAY = 24 * 60 * 60
    while True:
        now = time.time()
        for d in [UPLOADS_DIR, RENDERED_DIR]:
            if not os.path.exists(d): continue
            for f in os.listdir(d):
                filepath = os.path.join(d, f)
                if now - os.path.getmtime(filepath) > ONE_DAY:
                    try:
                        os.remove(filepath)
                    except:
                        pass
        time.sleep(3600) # Check every hour

threading.Thread(target=cleanup_old_files, daemon=True).start()
# Dummy Gradio interface to satisfy HF Free Tier
def dummy():
    return "Backend API is running!"
demo = gr.Interface(fn=dummy, inputs=None, outputs="text")
app = gr.mount_gradio_app(app, demo, path="/")


