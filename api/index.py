import sys
import os

# Add backend directory to Python path for Vercel Serverless Function runtime
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app

# Vercel Serverless entrypoint
handler = app
