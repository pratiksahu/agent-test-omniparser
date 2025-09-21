# Claude Development Guide - OmniParser Autonomous App

## Project Overview

This is a **fully local** UI automation application using Microsoft's OmniParser v2 for icon detection and autonomous web navigation. The entire stack runs locally without any external API dependencies.

## Architecture

### Tech Stack
- **Frontend**: Express.js web server with HTML interface
- **Backend**: Node.js with Express REST API
- **AI Models**: Local Python server running YOLOv8 and Florence-2
- **Automation**: Puppeteer for browser control
- **Communication**: HTTP between Node.js and Python servers

### Server Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Browser   │────▶│  Node.js Server │────▶│  Python Server  │
│  localhost:3000 │     │    Port 3000    │     │    Port 5001    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                         │
                               ▼                         ▼
                        ┌─────────────┐          ┌──────────────┐
                        │  Puppeteer  │          │ YOLOv8 Model │
                        │  Browser    │          │ Florence-2   │
                        └─────────────┘          └──────────────┘
```

## Directory Structure

```
agent-ui/
├── src/
│   ├── index.js              # Main Node.js server
│   ├── omniparser-local.js   # Local OmniParser client
│   ├── autonomous-agent.js   # Puppeteer automation
│   └── test.js               # Test suite
├── python/
│   ├── omniparser_local.py   # Python ML server
│   └── setup_models.py       # Model downloader
├── models/                   # Downloaded ML models (~2-3GB)
│   ├── yolo/                 # YOLOv8 weights
│   └── florence/             # Florence-2 model
├── screenshots/              # Captured screenshots
├── outputs/                  # Processing outputs
├── venv/                     # Python virtual environment
├── package.json             # Node.js dependencies
├── requirements.txt         # Python dependencies
├── setup.sh                 # Unix setup script
└── setup.bat               # Windows setup script
```

## Key Components

### 1. LocalOmniParser (src/omniparser-local.js)
- Manages communication with Python server
- Handles image parsing requests
- Provides fallback mock data
- Auto-starts Python server if needed

### 2. AutonomousAgent (src/autonomous-agent.js)
- Controls Puppeteer browser instance
- Executes UI interactions
- Implements goal-driven navigation
- Tracks action history

### 3. Python ML Server (python/omniparser_local.py)
- Runs YOLOv8 for object detection
- Uses Florence-2 for caption generation
- Provides REST endpoints for inference
- Falls back to OpenCV if models unavailable

## Development Commands

### Quick Start
```bash
# First time setup (macOS/Linux)
./setup.sh

# First time setup (Windows)
setup.bat

# Start Python server (Terminal 1)
source venv/bin/activate
python python/omniparser_local.py

# Start Node.js server (Terminal 2)
npm start

# Run tests
npm test
```

### Common Tasks

```bash
# Install new Python package
source venv/bin/activate
pip install <package>
pip freeze > requirements.txt

# Install new Node package
npm install <package>

# Test local inference
python test_inference.py

# Check server health
curl http://localhost:5001/health
curl http://localhost:3000/api/demo
```

## API Endpoints

### Node.js Server (Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | Web interface |
| POST | /api/parse-image | Parse uploaded image |
| POST | /api/autonomous/start | Start browser agent |
| POST | /api/autonomous/goal | Set automation goal |
| POST | /api/autonomous/explore | Autonomous exploration |
| POST | /api/autonomous/click-icon | Click specific icon |
| GET | /api/autonomous/history | Get action history |
| POST | /api/autonomous/stop | Stop agent |
| GET | /api/demo | Run demo analysis |

### Python Server (Port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Server status |
| POST | /parse | Full screen parsing |
| POST | /detect | Element detection only |

## Important Files

### Configuration
- `.env` - Environment variables (create from .env.example)
- `models/model_config.json` - Model paths and settings

### Entry Points
- `src/index.js` - Main Node.js application
- `python/omniparser_local.py` - Python ML server

## Common Issues & Solutions

### Port Already in Use
```bash
# Check what's using port 5001
lsof -i :5001

# Kill process using port
kill -9 <PID>

# Or change port in python/omniparser_local.py
```

### Python Module Not Found
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Models Not Downloaded
```bash
python python/setup_models.py
```

### Puppeteer Issues
```bash
# Reinstall Puppeteer with Chrome
npm uninstall puppeteer
npm install puppeteer
```

## Testing

### Unit Tests
```bash
npm test
```

### Manual Testing
```bash
# Test Python inference
curl -X POST http://localhost:5001/detect \
  -F "image=@test_ui.png"

# Test Node.js API
curl http://localhost:3000/api/demo

# Test autonomous agent
curl -X POST http://localhost:3000/api/autonomous/start \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## Performance Optimization

### GPU Support
```bash
# Install CUDA-enabled PyTorch
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Update .env
MODEL_DEVICE=cuda
```

### Model Optimization
- Reduce confidence threshold for more detections
- Increase IOU threshold to reduce duplicates
- Use smaller YOLOv8 variants (yolov8n.pt) for speed

## Debugging

### Enable Debug Logging
```python
# In python/omniparser_local.py
app.run(debug=True)
```

### Monitor Server Output
```bash
# Watch Python server logs
tail -f python.log

# Watch Node.js output
npm run dev  # Uses --watch flag
```

### Test Individual Components
```python
# Test Python model directly
from python.omniparser_local import LocalOmniParser
parser = LocalOmniParser()
result = parser.detect_elements('test.png')
```

## Model Information

### YOLOv8
- Model: yolov8m.pt (medium variant)
- Size: ~50MB
- Purpose: Object detection for UI elements
- Fallback: OpenCV contour detection

### Florence-2
- Model: microsoft/Florence-2-base
- Size: ~700MB
- Purpose: Generate captions for UI elements
- Optional: Works without it

## Contributing Guidelines

1. **Code Style**
   - JavaScript: ES6+ modules
   - Python: PEP 8
   - Use async/await for asynchronous operations

2. **Testing**
   - Add tests for new features
   - Ensure all tests pass before committing

3. **Documentation**
   - Update README.md for user-facing changes
   - Update this file for development changes

4. **Error Handling**
   - Always provide fallback behavior
   - Log errors appropriately
   - Return meaningful error messages

## Resources

- [OmniParser Paper](https://microsoft.github.io/OmniParser/)
- [YOLOv8 Documentation](https://docs.ultralytics.com/)
- [Florence-2 Model](https://huggingface.co/microsoft/Florence-2-base)
- [Puppeteer API](https://pptr.dev/)

## Notes for Claude

When working on this project:
1. Always ensure both servers are running (Python on 5001, Node on 3000)
2. The Python server provides the actual ML inference
3. The Node.js server handles web interface and browser automation
4. Models are stored locally - no API keys needed
5. Use mock data fallbacks when models aren't available
6. Everything runs locally for privacy and control