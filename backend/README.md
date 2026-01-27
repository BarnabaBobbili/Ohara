# Library Management System Backend

## Setup

### 1. Create Virtual Environment
```bash
python -m venv venv
```

### 2. Activate Virtual Environment
**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
Edit `.env` file with your database credentials:
- MongoDB URL
- Neo4j credentials

### 5. Run Server
```bash
uvicorn app.main:app --reload
```

The API will be available at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

## Project Structure
```
backend/
├── app/
│   ├── main.py           # FastAPI application
│   ├── config.py         # Configuration settings
│   ├── database/         # Database connections
│   ├── models/           # Data models
│   ├── routers/          # API endpoints
│   └── services/         # Business logic
├── requirements.txt      # Python dependencies
└── .env                  # Environment variables
```

## Database Setup

### SQLite
Automatically created on first run as `library.db`

### MongoDB
```bash
# Install MongoDB Community Edition
# Start MongoDB service
mongod --dbpath ./data/mongodb
```

### Neo4j
```bash
# Download from neo4j.com/download
# Start Neo4j
neo4j start
```
