import os
import pdfplumber
from docx import Document

from app.utilities.txt_clean import clean_text


def parse_pdf(file_path: str) -> str:
    """
    Extract text from PDF resume
    """
    text = ""

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + " "

    return clean_text(text)


def parse_docx(file_path: str) -> str:
    """
    Extract text from DOCX resume
    """
    doc = Document(file_path)
    text = " ".join([para.text for para in doc.paragraphs])
    return clean_text(text)


def parse_resume(file_path: str) -> str:
    """
    Main resume parsing function
    Detects file type and parses accordingly.
    Supports local files ('uploads/...') and remote Supabase files ('resumes/...').
    """
    import tempfile
    
    is_remote = False
    temp_path = file_path
    
    if file_path.startswith("resumes/"):
        from app.utilities import storage
        bytes_data = storage.download_resume_bytes(file_path)
        if not bytes_data:
            raise FileNotFoundError("Resume file not found in remote storage")
        
        ext = file_path.rsplit(".", 1)[-1].lower()
        fd, temp_path = tempfile.mkstemp(suffix=f".{ext}")
        with open(fd, 'wb') as f:
            f.write(bytes_data)
        is_remote = True
    else:
        if not os.path.exists(file_path):
            raise FileNotFoundError("Resume file not found locally")

    try:
        ext = temp_path.split(".")[-1].lower()

        if ext == "pdf":
            parsed_text = parse_pdf(temp_path)
        elif ext == "docx":
            parsed_text = parse_docx(temp_path)
        else:
            raise ValueError("Unsupported resume format")
            
        return parsed_text
    finally:
        if is_remote and os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    text = parse_resume("uploads/sample.pdf")
    print(text[:1000])