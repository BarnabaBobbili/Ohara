import httpx
import asyncio

async def test_google_books():
    client = httpx.AsyncClient(timeout=10.0)
    url = "https://www.googleapis.com/books/v1/volumes/dencDAAAQBAJ"
    
    try:
        response = await client.get(url)
        response.raise_for_status()
        item = response.json()
        
        volume_info = item.get("volumeInfo", {})
        access_info = item.get("accessInfo", {})
        
        # Extract ISBN
        identifiers = volume_info.get("industryIdentifiers", [])
        isbn = None
        for identifier in identifiers:
            if identifier.get("type") in ["ISBN_13", "ISBN_10"]:
                isbn = identifier.get("identifier")
                break
        
        result = {
            "source": "google_books",
            "source_id": item.get("id"),
            "title": volume_info.get("title", ""),
            "author": ", ".join(volume_info.get("authors", [])),
            "description": volume_info.get("description", "")[:100] + "..." if volume_info.get("description") else "",
            "cover_url": volume_info.get("imageLinks", {}).get("thumbnail"),
            "isbn": isbn,
            "publisher": volume_info.get("publisher", ""),
            "publish_date": volume_info.get("publishedDate", ""),
            "is_public_domain": access_info.get("accessViewStatus") == "FULL_PUBLIC_DOMAIN",
        }
        
        print("=== RESULT ===")
        for key, value in result.items():
            print(f"{key}: {value}")
            
    finally:
        await client.aclose()

if __name__ == "__main__":
    asyncio.run(test_google_books())
