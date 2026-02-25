from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # <--- IMPORT THIS
from sqlalchemy import text
from .database import engine, Base
from .routers import exams, auth, questions, batches, assignments, institutes, users, sessions, departments

# Create tables in Database
Base.metadata.create_all(bind=engine)

def _ensure_session_status_enum():
    if engine.dialect.name != "postgresql":
        return
    ddl = """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'session_status' AND e.enumlabel = 'missed'
        ) THEN
            ALTER TYPE session_status ADD VALUE 'missed';
        END IF;
    END $$;
    """
    with engine.begin() as conn:
        conn.execute(text(ddl))

_ensure_session_status_enum()

app = FastAPI(title="AI Proctor Admin")

# --- ADD THIS BLOCK TO FIX THE ERROR ---
origins = [
    "http://localhost:5173", # The address of your React Frontend
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (POST, GET, etc.)
    allow_headers=["*"],
)
# ---------------------------------------

# Include the Exam router
app.include_router(exams.router, prefix="/api", tags=["Exams"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(questions.router, prefix="/api", tags=["Questions"])
app.include_router(batches.router, prefix="/api", tags=["Batches"])
app.include_router(assignments.router, prefix="/api", tags=["Assignments"])
app.include_router(institutes.router, prefix="/api", tags=["Institutes"])
app.include_router(departments.router, prefix="/api", tags=["Departments"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(sessions.router, prefix="/api", tags=["Sessions"])

@app.get("/")
def health_check():
    return {"status": "System is running"}