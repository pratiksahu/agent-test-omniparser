#!/bin/bash

# OmniParser Local Setup Script

echo "======================================"
echo "   OmniParser Local Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python version
echo -e "\n${YELLOW}Checking Python installation...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}Python is not installed. Please install Python 3.8 or later.${NC}"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | grep -oE '[0-9]+\.[0-9]+')
echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"

# Create virtual environment
echo -e "\n${YELLOW}Creating Python virtual environment...${NC}"
if [ ! -d "venv" ]; then
    $PYTHON_CMD -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "\n${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Upgrade pip
echo -e "\n${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip --quiet

# Install Python dependencies
echo -e "\n${YELLOW}Installing Python dependencies...${NC}"
echo "This may take several minutes..."

# Install PyTorch (CPU version by default, modify for GPU)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    pip install torch torchvision --quiet
else
    # Linux/Windows
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu --quiet
fi

# Install other requirements
pip install -r requirements.txt --quiet

echo -e "${GREEN}✓ Python dependencies installed${NC}"

# Download models
echo -e "\n${YELLOW}Downloading OmniParser models...${NC}"
python python/setup_models.py

# Install Node.js dependencies
echo -e "\n${YELLOW}Installing Node.js dependencies...${NC}"
npm install

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}   Setup Complete!${NC}"
echo -e "${GREEN}======================================${NC}"

echo -e "\n${YELLOW}To start the application:${NC}"
echo "1. Start the Python server:"
echo "   source venv/bin/activate"
echo "   python python/omniparser_local.py"
echo ""
echo "2. In a new terminal, start the Node.js server:"
echo "   npm start"
echo ""
echo "3. Open your browser to:"
echo "   http://localhost:3000"

echo -e "\n${YELLOW}For GPU support:${NC}"
echo "Install CUDA-enabled PyTorch:"
echo "pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118"