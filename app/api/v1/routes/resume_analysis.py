from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body
from typing import List, Optional
import uuid
import os
import shutil
from cachetools import TTLCache
from pydantic import BaseModel

from app.core.security import get_current_user
from app.db.crud import get_resume_by_id, get_all_resumes
from app.services.resume_analyzer import ResumeAnalyzer
from app.services.llm_service import LLMService
from app.services.resume_parser import parse_resume

router = APIRouter(prefix="/resume-analysis", tags=["Resume Analysis"])
analyzer = ResumeAnalyzer()
llm_service = LLMService()

# Session cache for "Upload & Chat" (TTL: 1 hour, Max: 100 sessions)
session_cache = TTLCache(maxsize=100, ttl=3600)

class ChatRequest(BaseModel):
    message: str

class BatchAnalysisRequest(BaseModel):
    resume_ids: List[int]

@router.post("/single/{resume_id}")
def analyze_single_resume(
    resume_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Analyze a single existing resume."""
    resume = get_resume_by_id(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # DB columns: id, filename, uploaded_at, experience_years, extracted_skills, profile_data, (parsed_text if updated)
    # Let's assume parsed_text is in row[2] or we need to re-parse from file
    filename = resume[1]
    file_path = f"uploads/{filename}"
    
    try:
        if not os.path.exists(file_path):
             # Try absolute path from settings if relative fails
             from app.core.config import get_settings
             file_path = os.path.join(get_settings().UPLOAD_DIR, filename)
             
        text = parse_resume(file_path)
        analysis = analyzer.analyze_standalone(text)
        analysis["filename"] = filename
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/batch")
def analyze_batch(
    request: BatchAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """Analyze multiple resumes in batch."""
    results = []
    for rid in request.resume_ids:
        try:
            res = analyze_single_resume(rid, current_user)
            results.append(res)
        except Exception:
            continue
    return results

@router.post("/upload")
async def upload_and_analyze(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a new resume and get instant analysis + chat session."""
    temp_id = str(uuid.uuid4())
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    file_path = os.path.join(temp_dir, f"{temp_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        text = parse_resume(file_path)
        analysis = analyzer.analyze_standalone(text)
        
        # Create session
        session_id = str(uuid.uuid4())
        session_cache[session_id] = {
            "resume_text": text,
            "filename": file.filename,
            "analysis": analysis,
            "history": []
        }
        
        analysis["session_id"] = session_id
        analysis["filename"] = file.filename
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload and analysis failed: {str(e)}")
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/chat/{session_id}")
async def chat_with_resume(
    session_id: str,
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Chat about an uploaded resume in the current session."""
    session = session_cache.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session expired or not found")
    
    resume_text = session["resume_text"]
    history = session["history"]
    
    system_prompt = f"You are an expert career consultant and ATS analyzer. You are helping a candidate improve their resume. \n\nRESUME CONTENT:\n{resume_text[:4000]}\n\nPREVIOUS CONTEXT:\n{str(history[-5:]) if history else 'First message.'}"
    
    response = llm_service.get_chat_response(system_prompt, request.message)
    
    # Update history
    history.append({"user": request.message, "ai": response})
    session["history"] = history
    
    return {"response": response}
