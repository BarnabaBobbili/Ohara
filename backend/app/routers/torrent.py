"""
Torrent Router
Provides endpointsfor backend-based torrent integration
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pathlib import Path
from typing import List, Dict, Any
import os
from app.config import settings
from app.services.torrent_service import torrent_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/torrent", tags=["torrent"])


@router.get("/status")
async def get_torrent_status() -> Dict[str, Any]:
    """
    Check if torrent service is ready
    
    Returns:
        Dict with enabled status and file count
    """
    return {
        "enabled": settings.ENABLE_TORRENT,
        "configured": bool(settings.TORRENT_MAGNET_URI and settings.TORRENT_MAGNET_URI != "paste-your-magnet-link-here"),
        "ready": torrent_service.is_ready,
        "file_count": len(torrent_service.files_list) if torrent_service.is_ready else 0
    }


@router.get("/files")
async def get_files() -> List[Dict]:
    """
    Get list of all files in torrent
    
    Returns:
        List of file objects with index, name, size, extension
        
    Raises:
        HTTPException: If torrent is not ready
    """
    if not torrent_service.is_ready:
        raise HTTPException(status_code=503, detail="Torrent service not ready")
    
    return torrent_service.get_files()


@router.get("/stream/{file_index}")
async def stream_file(file_index: int):
    """
    Stream a specific file from the torrent
    
    Args:
        file_index: Index of the file to stream
        
    Returns:
        FileResponse with the requested file
        
    Raises:
        HTTPException: If file not found or torrent not ready
    """
    if not torrent_service.is_ready:
        raise HTTPException(status_code=503, detail="Torrent service not ready")
    
    file_path = torrent_service.get_file_path(file_index)
    
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Wait for file to be available (with timeout)
    import time
    max_wait = 30  # 30 seconds
    waited = 0
    
    while not os.path.exists(file_path) and waited < max_wait:
        time.sleep(1)
        waited += 1
    
    if not os.path.exists(file_path):
        # File still downloading, return progress
        progress = torrent_service.get_download_progress(file_index)
        raise HTTPException(
            status_code=202, 
            detail=f"File is downloading... {int(progress * 100)}% complete"
        )
    
    # Get file info
    file_name = torrent_service.files_list[file_index]['name']
    file_ext = torrent_service.files_list[file_index]['extension']
    
    # Determine media type
    media_types = {
        'pdf': 'application/pdf',
        'epub': 'application/epub+zip',
        'mobi': 'application/x-mobipocket-ebook',
        'azw3': 'application/vnd.amazon.ebook',
    }
    
    media_type = media_types.get(file_ext, 'application/octet-stream')
    
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=os.path.basename(file_name)
    )
