import sys
import os

# Ensure local api folder and backend folder are in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    from app.main import app
    handler = app
except Exception as e:
    from fastapi import FastAPI
    app = FastAPI()
    @app.get("/api/{path:path}")
    def catch_all(path: str):
        return {"error": "Failed to load FastAPI app", "details": str(e)}
    handler = app
