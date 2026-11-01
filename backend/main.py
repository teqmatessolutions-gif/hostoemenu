# main.py entry point for uvicorn and direct execution
import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8011))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)

