# OmniParser Autonomous App - Fully Local

An intelligent UI automation application using Microsoft's OmniParser v2 for icon detection and autonomous web navigation. **Runs completely locally** without requiring any external API calls.

## 🎯 Key Features

- **🔍 Icon & UI Element Detection**: Identifies buttons, icons, text, and interactable elements using YOLOv8
- **🤖 Autonomous Navigation**: Browser automation with goal-driven actions via Puppeteer
- **📊 Screen Parsing**: Analyzes UI layouts and suggests interactions
- **🎨 Smart Action Planning**: Prioritizes actions based on goals and confidence scores
- **⚡ Real-time Analysis**: Processes screenshots locally with ~1 second inference time
- **🔒 100% Private**: All processing happens on your machine - no data leaves your computer
- **🔄 Fallback Support**: Works even without models using OpenCV detection

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+ with pip
- **Git** for cloning the repository
- **8GB RAM** minimum (16GB recommended)
- **5GB disk space** for models

### Automatic Setup (Recommended)

**1. Clone the repository:**
```bash
git clone <repository-url>
cd agent-ui
```

**2. Run the setup script:**

**For macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**For Windows:**
```bash
setup.bat
```

The setup script will:
- ✅ Create a Python virtual environment
- ✅ Install all Python dependencies (PyTorch, YOLOv8, transformers)
- ✅ Download OmniParser models locally (~2-3GB)
- ✅ Install Node.js dependencies
- ✅ Configure the application

### Manual Setup

1. **Set up Python environment**:
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Download models
python python/setup_models.py
```

2. **Install Node.js dependencies**:
```bash
npm install
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env if needed (all defaults should work)
```

### 🏃 Running the Application

You need to run two servers:

#### Terminal 1 - Python ML Server:
```bash
# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Start Python server
python python/omniparser_local.py
```
You should see:
```
🚀 Starting Flask server on port 5001...
```

#### Terminal 2 - Node.js Application:
```bash
npm start
```
You should see:
```
🚀 OmniParser Autonomous App is running!
📍 Local: http://localhost:3000
```

#### 3. Access the Application:
Open your browser and navigate to: **http://localhost:3000**

### 🧪 Verify Installation

Test that everything is working:
```bash
# Test Python server health
curl http://localhost:5001/health

# Test Node.js API
curl http://localhost:3000/api/demo

# Run full test suite
npm test
```

## API Endpoints

### Parse Image
```bash
curl -X POST http://localhost:3000/api/parse-image \
  -F "image=@screenshot.png" \
  -F "context=login"
```

### Start Autonomous Agent
```bash
curl -X POST http://localhost:3000/api/autonomous/start \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Set and Execute Goal
```bash
curl -X POST http://localhost:3000/api/autonomous/goal \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Find and click login button",
    "keywords": ["login", "sign in"],
    "maxSteps": 5
  }'
```

### Autonomous Exploration
```bash
curl -X POST http://localhost:3000/api/autonomous/explore \
  -H "Content-Type: application/json" \
  -d '{"maxActions": 3, "waitTime": 2000}'
```

### Click Specific Icon
```bash
curl -X POST http://localhost:3000/api/autonomous/click-icon \
  -H "Content-Type: application/json" \
  -d '{"iconName": "settings"}'
```

## Usage Examples

### Basic Screen Parsing
```javascript
import { OmniParser } from './src/omniparser.js';

const parser = new OmniParser(process.env.HF_TOKEN);
const result = await parser.parseScreen('screenshot.png', {
  generateDescriptions: true,
  context: 'dashboard'
});

console.log(`Found ${result.summary.iconCount} icons`);
console.log(`Layout type: ${result.layout.type}`);
```

### Autonomous Browser Control
```javascript
import { AutonomousAgent } from './src/autonomous-agent.js';

const agent = new AutonomousAgent(parser);
await agent.initialize();
await agent.navigateTo('https://example.com');

// Set a goal
await agent.setGoal({
  description: 'Complete the signup process',
  keywords: ['signup', 'register', 'email', 'password'],
  maxSteps: 10
});

const result = await agent.executeGoal();
console.log(`Goal completed: ${result.success}`);
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Browser                          │
│                 http://localhost:3000                   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Node.js Express Server (Port 3000)         │
│  • Web Interface    • REST API    • WebSocket Support   │
└────────────┬───────────────────────┬────────────────────┘
             │                       │
    ┌────────▼──────────┐   ┌───────▼──────────┐
    │  LocalOmniParser  │   │ AutonomousAgent  │
    │    (JS Client)    │   │   (Puppeteer)    │
    └────────┬──────────┘   └──────────────────┘
             │
    ┌────────▼──────────────────────────────────┐
    │     Python ML Server (Port 5001)          │
    │  • YOLOv8 Detection  • Florence-2 Captions│
    └────────────────────────────────────────────┘

```

### Core Components

- **LocalOmniParser**: JavaScript client that communicates with Python server
- **AutonomousAgent**: Manages Puppeteer browser automation and goal execution
- **Python ML Server**: Runs YOLOv8 and Florence-2 models for inference
- **Express API**: RESTful endpoints for web interface and API consumers

## OmniParser v2 Capabilities

- 39.5% accuracy on ScreenSpot Pro benchmark
- 60% faster than v1 (0.6s/frame on A100)
- Enhanced small icon detection
- Interactability prediction
- DOM-like structured output

## 💻 System Requirements

### Minimum Requirements
- **Node.js** 18+ with npm
- **Python** 3.8+ with pip
- **RAM**: 8GB
- **Disk Space**: 5GB for models + workspace
- **Browser**: Chrome/Chromium (auto-installed by Puppeteer)

### Recommended Specifications
- **RAM**: 16GB for smooth performance
- **CPU**: Multi-core processor (4+ cores)
- **Storage**: SSD for faster model loading

### GPU Support (Optional but Recommended)
For 3-5x faster inference:
- NVIDIA GPU with CUDA 11.8+
- At least 4GB VRAM
- Install CUDA-enabled PyTorch:
  ```bash
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
  ```

## 🤖 Local Models

### Downloaded Automatically
- **YOLOv8** (50MB): Object detection optimized for UI elements
- **Florence-2-base** (700MB): Microsoft's vision-language model for captioning
- **Total Download**: ~2-3GB including dependencies

### Model Locations
```
models/
├── yolo/
│   └── yolov8m.pt          # YOLO weights
├── florence/
│   └── [model files]       # Florence-2 model
└── model_config.json       # Configuration
```

## 🛠️ Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Error: Port 5001 is already in use
lsof -i :5001  # Find process
kill -9 <PID>  # Kill process
```

#### Python Module Not Found
```bash
source venv/bin/activate
pip install -r requirements.txt
```

#### Puppeteer Can't Launch Browser
```bash
# Reinstall Puppeteer
npm uninstall puppeteer
npm install puppeteer
```

#### Models Not Loading
```bash
# Re-download models
python python/setup_models.py
```

### Performance Issues

#### Slow Inference
- Switch to GPU (see GPU Support above)
- Use smaller YOLO model: `yolov8n.pt` instead of `yolov8m.pt`
- Reduce image resolution in `omniparser_local.py`

#### High Memory Usage
- Close unnecessary browser tabs (Puppeteer)
- Restart Python server periodically
- Use environment variable: `export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512`

## 📚 Documentation

### For Developers
- See [CLAUDE.md](CLAUDE.md) for detailed development guide
- API documentation in code comments
- Test examples in `src/test.js`

### Project Structure
```
agent-ui/
├── src/                    # Node.js application
├── python/                 # Python ML server
├── models/                 # Downloaded models
├── screenshots/            # Captured screens
├── venv/                   # Python virtual env
└── docs/                   # Additional docs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- Microsoft Research for [OmniParser](https://microsoft.github.io/OmniParser/)
- Ultralytics for [YOLOv8](https://github.com/ultralytics/ultralytics)
- Google for Puppeteer
- Open source community

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/agent-ui/issues)
- **Documentation**: [CLAUDE.md](CLAUDE.md) for development details
- **Examples**: See `/src/test.js` for usage examples

---

**Note**: This application runs 100% locally. No data is sent to external servers, ensuring complete privacy and control over your automation workflows.