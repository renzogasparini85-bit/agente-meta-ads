#!/bin/bash
python3 -c "from database import init_db; init_db()"
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
