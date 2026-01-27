# Library Management System

A modern library management system with multi-database architecture.

## Project Structure

```
Library Management System/
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── layouts/       # Layout components
│   │   └── ...
│   ├── public/
│   └── package.json
│
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── database/      # Database connections
│   │   ├── models/        # Data models
│   │   ├── routers/       # API endpoints
│   │   └── services/      # Business logic
│   └── requirements.txt
│
└── docs/                  # Documentation

```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

## Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs on: `http://localhost:8000`

API Docs: `http://localhost:8000/docs`

## Databases

- **SQLite**: Transactional data (books, members, transactions)
- **MongoDB**: Document store (activity logs, analytics)
- **Neo4j**: Graph database (recommendations, relationships)

## Technologies

### Frontend
- React 19
- Vite
- React Router
- Tailwind CSS

### Backend
- FastAPI
- SQLAlchemy (SQLite)
- PyMongo (MongoDB)
- Neo4j Driver

## Development

1. Start MongoDB (optional): `mongod`
2. Start Neo4j (optional): `neo4j start`
3. Start backend: `cd backend && uvicorn app.main:app --reload`
4. Start frontend: `cd frontend && npm run dev`
