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
    Detects file type and parses accordingly
    """

    if not os.path.exists(file_path):
        raise FileNotFoundError("Resume file not found")

    ext = file_path.split(".")[-1].lower()

    if ext == "pdf":
        return parse_pdf(file_path)

    elif ext == "docx":
        return parse_docx(file_path)

    else:
        raise ValueError("Unsupported resume format")

if __name__ == "__main__":
    text = parse_resume("uploads/sample.pdf")
    print(text[:1000])