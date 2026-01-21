import os
from fastapi import UploadFile

# Project root directory
BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")


def save_resume(file: UploadFile) -> str:
    """
    Save uploaded resume file to uploads directory
    """

    # Create uploads folder if not exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as f:
        f.write(file.file.read())

    return file_path
