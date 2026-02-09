"""
External Book Sources Service
Provides integration with multiple open book APIs
"""
import httpx
import asyncio
import json
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from cachetools import TTLCache


class OpenLibraryAPI:
    """Integration with Open Library API"""
    
    BASE_URL = "https://openlibrary.org"
    COVERS_URL = "https://covers.openlibrary.org/b"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search books in Open Library"""
        try:
            url = f"{self.BASE_URL}/search.json"
            params = {"q": query, "limit": limit}
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for doc in data.get("docs", []):
                results.append({
                    "source": "openlibrary",
                    "source_id": doc.get("key", "").replace("/works/", ""),
                    "title": doc.get("title", ""),
                    "author": ", ".join(doc.get("author_name", [])),
                    "description": "",  # Open Library doesn't provide full descriptions in search
                    "cover_url": self._get_cover_url(doc),
                    "isbn": doc.get("isbn", [None])[0],
                    "is_public_domain": self._check_public_domain(doc.get("first_publish_year")),
                    "can_borrow": False,
                    "formats": ["online"],
                })
            return results
        except Exception as e:
            print(f"OpenLibrary search error: {e}")
            return []
    
    async def get_by_isbn(self, isbn: str) -> Optional[Dict]:
        """Get book details by ISBN"""
        try:
            url = f"{self.BASE_URL}/isbn/{isbn}.json"
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            return {
                "source": "openlibrary",
                "source_id": data.get("key", "").replace("/books/", ""),
                "title": data.get("title", ""),
                "isbn": isbn,
                "cover_url": f"{self.COVERS_URL}/isbn/{isbn}-L.jpg",
            }
        except Exception as e:
            print(f"OpenLibrary ISBN lookup error: {e}")
            return None
    
    def _get_cover_url(self, doc: dict) -> Optional[str]:
        """Extract cover URL from document"""
        if "isbn" in doc and doc["isbn"]:
            return f"{self.COVERS_URL}/isbn/{doc['isbn'][0]}-L.jpg"
        if "cover_i" in doc:
            return f"{self.COVERS_URL}/id/{doc['cover_i']}-L.jpg"
        return None
    
    def _check_public_domain(self, year: Optional[int]) -> bool:
        """Check if book is likely public domain (pre-1928)"""
        if year and year < 1928:
            return True
        return False
    
    async def get_book(self, work_id: str) -> Optional[Dict]:
        """Get complete book metadata from Open Library"""
        try:
            # Fetch work details
            work_url = f"{self.BASE_URL}/works/{work_id}.json"
            work_response = await self.client.get(work_url)
            work_response.raise_for_status()
            work_data = work_response.json()
            
            # Get title
            title = work_data.get("title", "")
            
            # Get description
            description = work_data.get("description", "")
            if isinstance(description, dict):
                description = description.get("value", "")
            
            # Get authors
            authors = []
            for author_ref in work_data.get("authors", []):
                author_key = author_ref.get("author", {}).get("key", "")
                if author_key:
                    try:
                        author_url = f"{self.BASE_URL}{author_key}.json"
                        author_response = await self.client.get(author_url)
                        if author_response.status_code == 200:
                            author_data = author_response.json()
                            authors.append(author_data.get("name", ""))
                    except:
                        pass
            
            # Get cover
            covers = work_data.get("covers", [])
            cover_url = None
            if covers:
                cover_url = f"{self.COVERS_URL}/id/{covers[0]}-L.jpg"
            
            # Get first publish year
            first_publish_year = work_data.get("first_publish_date", "")
            
            return {
                "source": "openlibrary",
                "source_id": work_id,
                "title": title,
                "author": ", ".join(authors) if authors else "Unknown",
                "description": description,
                "cover_url": cover_url,
                "isbn": None,
                "publisher": "",
                "publish_date": str(first_publish_year) if first_publish_year else "",
                "is_public_domain": False,
                "can_borrow": True,  # Most OL books can be borrowed
                "formats": ["borrow"],
                "preview_link": f"https://openlibrary.org/works/{work_id}",
            }
        except Exception as e:
            print(f"Open Library get book error: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


class GutendexAPI:
    """Integration with Gutendex (Project Gutenberg API)"""
    
    BASE_URL = "https://gutendex.com"
    GUTENBERG_URL = "https://www.gutenberg.org"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0, follow_redirects=True)
    
    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search books in Project Gutenberg"""
        try:
            url = f"{self.BASE_URL}/books"
            params = {"search": query}
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for book in data.get("results", [])[:limit]:
                formats = self._extract_formats(book.get("formats", {}))
                results.append({
                    "source": "gutenberg",
                    "source_id": str(book.get("id")),
                    "title": book.get("title", ""),
                    "author": self._get_author(book.get("authors", [])),
                    "description": "",  # Gutenberg doesn't provide descriptions in search
                    "cover_url": self._get_cover_url(book),
                    "isbn": None,
                    "is_public_domain": True,  # All Gutenberg books are public domain
                    "can_borrow": False,
                    "formats": list(formats.keys()),
                    "download_urls": formats,
                })
            return results
        except Exception as e:
            print(f"Gutendex search error: {e}")
            return []
    
    async def get_book(self, book_id: str) -> Optional[Dict]:
        """Get book details by Gutenberg ID"""
        try:
            url = f"{self.BASE_URL}/books/{book_id}"
            response = await self.client.get(url)
            response.raise_for_status()
            book = response.json()
            
            formats = self._extract_formats(book.get("formats", {}))
            return {
                "source": "gutenberg",
                "source_id": str(book.get("id")),
                "title": book.get("title", ""),
                "author": self._get_author(book.get("authors", [])),
                "cover_url": self._get_cover_url(book),
                "is_public_domain": True,
                "formats": list(formats.keys()),
                "download_urls": formats,
            }
        except Exception as e:
            print(f"Gutendex get book error: {e}")
            return None
    
    def _extract_formats(self, formats_dict: dict) -> Dict[str, str]:
        """Extract download URLs for different formats"""
        result = {}
        for mime_type, url in formats_dict.items():
            if "epub" in mime_type.lower():
                result["epub"] = url
            elif "pdf" in mime_type.lower():
                result["pdf"] = url
            elif "text/plain" in mime_type.lower() and "txt" not in result:
                result["txt"] = url
        return result
    
    def _get_author(self, authors: list) -> str:
        """Get formatted author name"""
        if not authors:
            return "Unknown"
        author = authors[0]
        return author.get("name", "Unknown")
    
    def _get_cover_url(self, book: dict) -> Optional[str]:
        """Extract cover URL"""
        formats = book.get("formats", {})
        for key, url in formats.items():
            if "image/jpeg" in key:
                return url
        return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


class InternetArchiveAPI:
    """Integration with Internet Archive API"""
    
    BASE_URL = "https://archive.org"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=15.0, follow_redirects=True)
    
    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search books in Internet Archive"""
        try:
            url = f"{self.BASE_URL}/advancedsearch.php"
            params = {
                "q": f"mediatype:texts AND ({query})",
                "fl[]": ["identifier", "title", "creator", "description", "year"],
                "rows": limit,
                "page": 1,
                "output": "json",
            }
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for doc in data.get("response", {}).get("docs", []):
                identifier = doc.get("identifier")
                # Handle creator being string or list
                creator = doc.get("creator", "Unknown")
                if isinstance(creator, list):
                    creator = ", ".join(str(c) for c in creator) if creator else "Unknown"
                
                results.append({
                    "source": "internet_archive",
                    "source_id": identifier,
                    "title": doc.get("title", ""),
                    "author": creator,
                    "description": doc.get("description", ""), # Will be enriched if needed
                    "cover_url": f"{self.BASE_URL}/services/img/{identifier}",
                    "isbn": None,
                    "is_public_domain": True,  # Most IA books are
                    "can_borrow": True,  # Many support borrowing
                    "formats": ["epub", "pdf"],
                })
            return results
        except Exception as e:
            print(f"Internet Archive search error: {e}")
            return []
    
    async def get_download_urls(self, identifier: str) -> Dict[str, str]:
        """Get download URLs for a book"""
        try:
            url = f"{self.BASE_URL}/metadata/{identifier}"
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            files = data.get("files", [])
            download_urls = {}
            
            for file_info in files:
                name = file_info.get("name", "")
                if name.endswith(".epub"):
                    download_urls["epub"] = f"{self.BASE_URL}/download/{identifier}/{name}"
                elif name.endswith(".pdf"):
                    download_urls["pdf"] = f"{self.BASE_URL}/download/{identifier}/{name}"
            
            return download_urls
        except Exception as e:
            print(f"Internet Archive download URLs error: {e}")
            return {}
    
    async def get_book(self, identifier: str) -> Optional[Dict]:
        """Get complete book metadata and download URLs"""
        try:
            url = f"{self.BASE_URL}/metadata/{identifier}"
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            metadata = data.get("metadata", {})
            files = data.get("files", [])
            
            # Extract download URLs
            download_urls = {}
            for file_info in files:
                name = file_info.get("name", "")
                if name.endswith(".epub"):
                    download_urls["epub"] = f"{self.BASE_URL}/download/{identifier}/{name}"
                elif name.endswith(".pdf"):
                    download_urls["pdf"] = f"{self.BASE_URL}/download/{identifier}/{name}"
            
            # Handle creator/author being string or list
            creator = metadata.get("creator", "Unknown")
            if isinstance(creator, list):
                creator = ", ".join(str(c) for c in creator) if creator else "Unknown"
            
            # Handle title being string or list
            title = metadata.get("title", "")
            if isinstance(title, list):
                title = title[0] if title else ""
            
            # Handle description being string or list
            description = metadata.get("description", "")
            if isinstance(description, list):
                description = description[0] if description else ""
            
            return {
                "source": "internet_archive",
                "source_id": identifier,
                "title": title,
                "author": creator,
                "description": description,
                "cover_url": f"{self.BASE_URL}/services/img/{identifier}",
                "isbn": None,
                "publisher": metadata.get("publisher", ""),
                "publish_date": metadata.get("date", metadata.get("year", "")),
                "is_public_domain": True,
                "can_borrow": False,
                "formats": list(download_urls.keys()),
                "download_urls": download_urls,
            }
        except Exception as e:
            print(f"Internet Archive get book error: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


class GoogleBooksAPI:
    """Integration with Google Books API (for metadata and previews)"""
    
    BASE_URL = "https://www.googleapis.com/books/v1"
    
    def __init__(self, api_key: Optional[str] = None):
        self.client = httpx.AsyncClient(timeout=10.0)
        self.api_key = api_key
    
    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search books in Google Books"""
        try:
            url = f"{self.BASE_URL}/volumes"
            params = {
                "q": query,
                "maxResults": limit,
                "printType": "books",
            }
            if self.api_key:
                params["key"] = self.api_key
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Handle case where API returns no items (copyrighted books, rate limits, etc)
            items = data.get("items")
            if not items:
                print(f"Google Books: No items returned for query: {query}")
                return []
            
            results = []
            for item in items:
                volume_info = item.get("volumeInfo", {})
                access_info = item.get("accessInfo", {})
                
                results.append({
                    "source": "google_books",
                    "source_id": item.get("id"),
                    "title": volume_info.get("title", ""),
                    "author": ", ".join(volume_info.get("authors", [])),
                    "description": volume_info.get("description", ""),  # Add description
                    "cover_url": volume_info.get("imageLinks", {}).get("thumbnail"),
                    "isbn": self._get_isbn(volume_info.get("industryIdentifiers", [])),
                    "publisher": volume_info.get("publisher", ""),
                    "publish_date": volume_info.get("publishedDate", ""),
                    "is_public_domain": access_info.get("accessViewStatus") == "FULL_PUBLIC_DOMAIN",
                    "can_borrow": False,
                    "formats": ["preview"],
                    "preview_link": volume_info.get("previewLink"),
                })
            return results
        except httpx.HTTPStatusError as e:
            print(f"Google Books HTTP error: {e.response.status_code} - {e.response.text}")
            return []
        except Exception as e:
            print(f"Google Books search error: {e}")
            return []
    
    def _get_isbn(self, identifiers: list) -> Optional[str]:
        """Extract ISBN from industry identifiers"""
        for identifier in identifiers:
            if identifier.get("type") in ["ISBN_13", "ISBN_10"]:
                return identifier.get("identifier")
        return None
    
    async def get_volume(self, volume_id: str) -> Optional[Dict]:
        """Get detailed volume information"""
        try:
            url = f"{self.BASE_URL}/volumes/{volume_id}"
            params = {}
            if self.api_key:
                params["key"] = self.api_key
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            item = response.json()
            
            volume_info = item.get("volumeInfo", {})
            access_info = item.get("accessInfo", {})
            
            # Debug logging
            print(f"DEBUG Google Books: title={volume_info.get('title')}")
            print(f"DEBUG Google Books: publisher={volume_info.get('publisher')}")
            print(f"DEBUG Google Books: publishedDate={volume_info.get('publishedDate')}")
            print(f"DEBUG Google Books: industryIdentifiers={volume_info.get('industryIdentifiers')}")
            
            return {
                "source": "google_books",
                "source_id": item.get("id"),
                "title": volume_info.get("title", ""),
                "author": ", ".join(volume_info.get("authors", [])),
                "description": volume_info.get("description", ""),
                "cover_url": volume_info.get("imageLinks", {}).get("thumbnail"),
                "isbn": self._get_isbn(volume_info.get("industryIdentifiers", [])),
                "publisher": volume_info.get("publisher", ""),
                "publish_date": volume_info.get("publishedDate", ""),
                "is_public_domain": access_info.get("accessViewStatus") == "FULL_PUBLIC_DOMAIN",
                "can_borrow": False,
                "formats": ["preview"],
                "preview_link": volume_info.get("previewLink"),
            }
        except Exception as e:
            print(f"Google Books get volume error: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


class BookSourceAggregator:
    """Aggregates results from multiple book sources"""
    
    def __init__(self, google_api_key: Optional[str] = None):
        self.openlibrary = OpenLibraryAPI()
        self.gutenberg = GutendexAPI()
        self.internet_archive = InternetArchiveAPI()
        self.google_books = GoogleBooksAPI(google_api_key)
        # Cache search results for 1 hour (3600 seconds)
        self.search_cache = TTLCache(maxsize=1000, ttl=3600)
    
    async def unified_search(self, query: str, sources: List[str] = None) -> Dict:
        """Search across all enabled sources IN PARALLEL for speed"""
        # Check cache first
        cache_key = f"{query}:{','.join(sorted(sources or []))}"
        if cache_key in self.search_cache:
            print(f"Cache hit for query: {query}")
            return self.search_cache[cache_key]
        
        if sources is None:
            # Include Google Books by default for better descriptions
            sources = ["gutenberg", "internet_archive", "google_books", "openlibrary"]
        
        # Create tasks for parallel execution
        tasks = []
        searched_sources = []
        
        if "gutenberg" in sources:
            tasks.append(self.gutenberg.search(query, limit=5))
            searched_sources.append("gutenberg")
        
        if "internet_archive" in sources:
            tasks.append(self.internet_archive.search(query, limit=5))
            searched_sources.append("internet_archive")
        
        if "openlibrary" in sources:
            tasks.append(self.openlibrary.search(query, limit=5))
            searched_sources.append("openlibrary")
        
        if "google_books" in sources:
            tasks.append(self.google_books.search(query, limit=10))
            searched_sources.append("google_books")
        
        # Execute all API calls in parallel
        results_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Flatten results and handle exceptions
        all_results = []
        for result in results_list:
            if isinstance(result, list):
                all_results.extend(result)
            elif isinstance(result, Exception):
                print(f"API error: {result}")
        
        result_dict = {
            "query": query,
            "total_results": len(all_results),
            "results": all_results,
            "sources_searched": searched_sources,
        }
        
        # Store in cache for future requests
        self.search_cache[cache_key] = result_dict
        return result_dict
    
    async def get_unified_description(self, title: str, author: str = "") -> str:
        """
        Get book description with fallback chain:
        1. Google Books (best descriptions)
        2. Open Library
        3. Generated description
        """
        try:
            # Try Google Books first (most comprehensive)
            query = f"{title} {author}".strip()
            gb_results = await self.google_books.search(query, limit=1)
            if gb_results and len(gb_results) > 0:
                description = gb_results[0].get("description")
                if description and len(description) > 50:  # Ensure meaningful content
                    return description
            
            # Fallback to Open Library
            ol_results = await self.openlibrary.search(query, limit=1)
            if ol_results and len(ol_results) > 0:
                description = ol_results[0].get("description")
                if description and len(description) > 50:
                    return description
            
            # Generate basic description as last resort
            if author:
                return f"A book by {author}. Explore '{title}' to discover more about this literary work."
            else:
                return f"Discover '{title}' and explore this literary work in our collection."
                
        except Exception as e:
            print(f"Error fetching unified description: {e}")
            return f"Discover more about '{title}' in our collection."
    
    async def close_all(self):
        """Close all HTTP clients"""
        await self.openlibrary.close()
        await self.gutenberg.close()
        await self.internet_archive.close()
        await self.google_books.close()
