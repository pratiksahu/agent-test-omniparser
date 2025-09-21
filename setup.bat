@echo off
REM OmniParser Local Setup Script for Windows

echo ======================================
echo    OmniParser Local Setup (Windows)
echo ======================================

REM Check Python installation
echo.
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed. Please install Python 3.8 or later.
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Python %PYTHON_VERSION% found

REM Create virtual environment
echo.
echo Creating Python virtual environment...
if not exist "venv" (
    python -m venv venv
    echo Virtual environment created
) else (
    echo Virtual environment already exists
)

REM Activate virtual environment
echo.
echo Activating virtual environment...
call venv\Scripts\activate

REM Upgrade pip
echo.
echo Upgrading pip...
python -m pip install --upgrade pip --quiet

REM Install Python dependencies
echo.
echo Installing Python dependencies...
echo This may take several minutes...

REM Install PyTorch (CPU version)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu --quiet

REM Install other requirements
pip install -r requirements.txt --quiet

echo Python dependencies installed

REM Download models
echo.
echo Downloading OmniParser models...
python python\setup_models.py

REM Install Node.js dependencies
echo.
echo Installing Node.js dependencies...
npm install

echo.
echo ======================================
echo    Setup Complete!
echo ======================================

echo.
echo To start the application:
echo.
echo 1. Start the Python server:
echo    venv\Scripts\activate
echo    python python\omniparser_local.py
echo.
echo 2. In a new terminal, start the Node.js server:
echo    npm start
echo.
echo 3. Open your browser to:
echo    http://localhost:3000

echo.
echo For GPU support:
echo Install CUDA-enabled PyTorch:
echo pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

pause