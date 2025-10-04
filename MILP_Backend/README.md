# Backend Server - How to Run

## Prerequisites

Make sure you have installed all dependencies:
```bash
cd MILP_Backend
pip install -r requirements.txt
```

## Running the Server

There are **3 ways** to start the backend server:

### Method 1: Using run.py (Recommended)
```bash
cd MILP_Backend
python run.py
```

### Method 2: Using uvicorn directly
```bash
cd MILP_Backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Method 3: Using Python module
```bash
cd MILP_Backend
python -m app.main
```

## Expected Output

When the server starts successfully, you should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```
