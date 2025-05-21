@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM 1) Activate your virtualenv
REM (adjust the path if your venv folder is not named "venv")
call "%~dp0venv\Scripts\activate.bat"

REM ─────────────────────────────────────────────────────────────────────────────
REM 2) Start the FastAPI backend in its own window
start "Backend" cmd /k "uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

REM ─────────────────────────────────────────────────────────────────────────────
REM 3) Start the Streamlit frontend in its own window
start "Frontend" cmd /k "streamlit run frontend/app.py"

REM ─────────────────────────────────────────────────────────────────────────────
REM 4) Keep this window open so you can see any errors here
echo.
echo Press any key to close this launcher window...
pause >nul
