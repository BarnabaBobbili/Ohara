"""
Torrent Service
Handles torrent connection, file listing, and streaming using libtorrent
"""
try:
    import libtorrent as lt
    LIBTORRENT_AVAILABLE = True
except (ImportError, OSError) as e:
    # libtorrent not available (missing DLLs on Windows or not installed)
    LIBTORRENT_AVAILABLE = False
    lt = None

import time
import os
from pathlib import Path
from typing import List, Dict, Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class TorrentService:
    def __init__(self):
        self.session = None
        self.torrent_handle = None
        self.is_ready = False
        self.files_list = []
        
    def start(self):
        """Initialize torrent session and add torrent"""
        if not LIBTORRENT_AVAILABLE:
            logger.warning("libtorrent is not available - torrent features disabled")
            logger.warning("On Windows, libtorrent requires specific DLLs. Consider using an alternative approach.")
            return False
            
        if not settings.ENABLE_TORRENT or not settings.TORRENT_MAGNET_URI:
            logger.warning("Torrent feature is disabled or not configured")
            return False
            
        if settings.TORRENT_MAGNET_URI == "paste-your-magnet-link-here":
            logger.warning("Magnet link not configured")
            return False
        
        try:
            # Create session
            self.session = lt.session()
            self.session.listen_on(6881, 6891)
            
            # Add magnet link
            logger.info("Adding torrent from magnet link...")
            params = lt.parse_magnet_uri(settings.TORRENT_MAGNET_URI)
            
            # Set download path to temp directory
            save_path = str(Path.home() / "Downloads" / "LMS_Torrents")
            os.makedirs(save_path, exist_ok=True)
            params.save_path = save_path
            
            # Don't download anything by default
            params.flags = lt.torrent_flags.sequential_download | lt.torrent_flags.auto_managed
            
            self.torrent_handle = self.session.add_torrent(params)
            
            logger.info("Waiting for torrent metadata...")
            # Wait for metadata (up to 60 seconds)
            for _ in range(60):
                if self.torrent_handle.has_metadata():
                    break
                time.sleep(1)
            
            if not self.torrent_handle.has_metadata():
                logger.error("Failed to get torrent metadata")
                return False
            
            # Get file list
            torrent_info = self.torrent_handle.torrent_file()
            files = torrent_info.files()
            
            self.files_list = []
            for i in range(files.num_files()):
                file_path = files.file_path(i)
                file_size = files.file_size(i)
                self.files_list.append({
                    "index": i,
                    "name": file_path,
                    "size": file_size,
                    "extension": Path(file_path).suffix[1:].lower()
                })
            
            self.is_ready = True
            logger.info(f"Torrent ready with {len(self.files_list)} files")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start torrent service: {e}")
            return False
    
    def get_files(self) -> List[Dict]:
        """Get list of all files in torrent"""
        return self.files_list
    
    def get_file_path(self, file_index: int) -> Optional[str]:
        """Get local file path for a specific file index"""
        if not self.is_ready or not self.torrent_handle:
            return None
        
        if file_index < 0 or file_index >= len(self.files_list):
            return None
        
        # Priority download this specific file
        self.torrent_handle.file_priority(file_index, 7)  # Maximum priority
        
        # Get save path and file name
        save_path = self.torrent_handle.save_path()
        file_name = self.files_list[file_index]['name']
        full_path = os.path.join(save_path, file_name)
        
        return full_path
    
    def get_download_progress(self, file_index: int) -> float:
        """Get download progress for a specific file (0.0 to 1.0)"""
        if not self.is_ready or not self.torrent_handle:
            return 0.0
        
        status = self.torrent_handle.status()
        return status.progress
    
    def stop(self):
        """Stop torrent session"""
        if self.session:
            self.session.pause()
            logger.info("Torrent service stopped")


# Global torrent service instance
torrent_service = TorrentService()
