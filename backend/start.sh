#!/bin/bash
# Run from project root: bash backend/start.sh
cd "$(dirname "$0")/.."
pip install -r backend/requirements.txt -q
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
