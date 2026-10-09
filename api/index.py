import sys
import os

# Resolve absolute path to backend directory
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(base_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.main import app
    handler = app
except Exception as e:
    from fastapi import FastAPI
    app = FastAPI()
    @app.get("/api/{path:path}")
    def catch_all(path: str):
        return {"error": "Failed to load backend app", "details": str(e)}
    handler = app

