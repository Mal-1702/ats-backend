import os
import logging
from app.db.crud import get_stale_resumes_for_cleanup, delete_resume, log_audit_event
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class DataLifecycleManager:
    """Manages archival and permanent deletion of resume data."""

    @staticmethod
    def cleanup_stale_resumes():
        """
        Executes the cleanup process for resumes that have exceeded 
        their retention period and are no longer linked to active jobs.
        """
        retention_days = settings.RESUME_RETENTION_DAYS
        logger.info(f"Starting stale resume cleanup (Retention: {retention_days} days)")
        
        stale_records = get_stale_resumes_for_cleanup(retention_days)
        
        if not stale_records:
            logger.info("No stale resumes found for cleanup.")
            return {"deleted_count": 0, "failed_count": 0}

        deleted_count = 0
        failed_count = 0
        
        for resume_id, filename in stale_records:
            try:
                logger.info(f"Processing cleanup for resume {resume_id} ({filename})")
                
                # 1. Delete from DB (handles rankings and job_resumes via Cascade if setup, or explicit)
                # Note: delete_resume in crud.py already handles rankings deletion.
                deleted_filename = delete_resume(resume_id)
                
                if deleted_filename:
                    # 2. File Storage Cleanup
                    file_path = os.path.join(settings.UPLOAD_DIR, deleted_filename)
                    if os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                            logger.info(f"Successfully deleted physical file: {file_path}")
                        except OSError as e:
                            logger.error(f"Failed to delete physical file {file_path}: {e}")
                            # We still count as deleted because DB record is gone, 
                            # but we log the storage orphan.
                            
                    # 3. Audit Log
                    log_audit_event(
                        target_type="resume",
                        target_id=resume_id,
                        action="permanently_deleted",
                        reason=f"Retention period of {retention_days} days expired for associated closed jobs."
                    )
                    deleted_count += 1
                else:
                    failed_count += 1
                    
            except Exception as e:
                logger.error(f"Error deleting resume {resume_id}: {e}")
                failed_count += 1
                
        logger.info(f"Cleanup finished. Deleted: {deleted_count}, Failed: {failed_count}")
        return {"deleted_count": deleted_count, "failed_count": failed_count}

    @staticmethod
    def archive_job_data(job_id: int, reason: str = None):
        """
        Explicitly archives all data for a job.
        (Usually called when job status is toggled to closed).
        """
        from app.db.crud import close_job
        return close_job(job_id, reason)
