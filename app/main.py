from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from app import models, database, services
import os
import shutil
from pathlib import Path
import uuid

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")


@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("app/static/index.html", "r") as f:
        content = f.read()
    return HTMLResponse(content=content)

@app.post("/submit")
async def create_upload_file(
    image: UploadFile = File(None),
    audio: UploadFile = File(None),
    db: Session = Depends(database.get_db)
):
    upload_dir = Path("app/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)

    image_path = None
    audio_text = None

    if image:
        file_extension = os.path.splitext(image.filename)[1]
        new_filename = f"{uuid.uuid4()}{file_extension}"
        image_full_path = upload_dir / new_filename

        with open(image_full_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_path = str(image_full_path)

    if audio:
        file_extension = os.path.splitext(audio.filename)[1]
        if not file_extension:
            file_extension = ".wav" # Default to wav if no extension provided

        new_filename = f"{uuid.uuid4()}{file_extension}"
        audio_full_path = upload_dir / new_filename

        with open(audio_full_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        # Transcribe audio
        audio_text = services.transcribe_audio(str(audio_full_path))

    if not image and not audio:
        return {"error": "No file uploaded"}

    db_input = models.Input(
        text_payload=audio_text,
        image_path=image_path,
        status="pending"
    )

    db.add(db_input)
    db.commit()
    db.refresh(db_input)

    return {"id": db_input.id, "status": db_input.status}

@app.get("/status/{task_id}")
async def get_status(task_id: int, db: Session = Depends(database.get_db)):
    task = db.query(models.Input).filter(models.Input.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "id": task.id,
        "status": task.status,
        "response_text": task.response_text,
        "text_payload": task.text_payload
    }
