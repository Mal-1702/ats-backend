import re

def clean_text(text: str) -> str:
    """
    Cleans resume text by removing noise and normalizing spacing
    """

    if not text:
        return ""

    # Remove extra whitespace
    text = re.sub(r"\s+", " ", text)

    # Remove non-printable characters
    text = re.sub(r"[^\x20-\x7E]", " ", text)

    # Remove repeated dots or dashes
    text = re.sub(r"[.\-]{2,}", " ", text)

    return text.strip()
