# OmniParser Autonomous App - Enterprise-Grade Local UI Automation

> An intelligent, privacy-first UI automation solution leveraging Microsoft's OmniParser v2 for advanced icon detection and autonomous web navigation. **100% local execution** with zero external dependencies.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![OmniParser](https://img.shields.io/badge/OmniParser-v2.0-purple)](https://microsoft.github.io/OmniParser/)

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

- **Issues**: [GitHub Issues](https://github.com/pratiksahu/agent-test-omniparser/issues)
- **Documentation**: [CLAUDE.md](CLAUDE.md) for development details
- **Examples**: See `/src/test.js` for usage examples

---

## 🚀 Professional AI Consulting Services

<div align="center">
  <img src="https://geekyants.com/images/geekyants-logo.png" alt="GeekyAnts" width="200"/>

  ### Transform Your Business with Enterprise AI Solutions

  **[GeekyAnts](https://geekyants.com)** - Your Partner in AI Innovation
</div>

### 🎯 Our AI Expertise

At **GeekyAnts**, we specialize in delivering cutting-edge AI solutions that drive real business value:

#### 🤖 **Autonomous AI Agents**
- Custom AI agents tailored to your business processes
- Intelligent automation for complex workflows
- Integration with existing enterprise systems
- Scalable, production-ready deployments

#### 🧠 **Computer Vision & ML Solutions**
- Advanced image and video processing systems
- Custom model training and optimization
- Real-time inference pipelines
- Edge deployment strategies

#### 💼 **Enterprise AI Integration**
- LLM integration and fine-tuning
- RAG (Retrieval-Augmented Generation) systems
- Knowledge base development
- AI-powered analytics dashboards

### 🏆 Why Choose GeekyAnts?

- **✅ 500+ Engineers** - Large team of AI/ML specialists and full-stack developers
- **✅ 15+ Years** - Proven track record in enterprise software development
- **✅ Global Presence** - Offices in India, USA, and UK
- **✅ Fortune 500 Clients** - Trusted by leading global brands
- **✅ End-to-End Solutions** - From POC to production deployment

### 💡 Our Process

1. **Discovery & Consultation** - Understanding your unique challenges
2. **Solution Architecture** - Designing scalable, efficient AI systems
3. **Rapid Prototyping** - Quick POCs to validate approach
4. **Production Development** - Enterprise-grade implementation
5. **Deployment & Support** - Seamless integration and ongoing optimization

### 📋 Services We Offer

| Service | Description |
|---------|-------------|
| **AI Strategy Consulting** | Roadmap development for AI adoption |
| **Custom Model Development** | Training models specific to your domain |
| **System Integration** | Seamless AI integration with existing infrastructure |
| **Performance Optimization** | Improving inference speed and accuracy |
| **MLOps Implementation** | CI/CD pipelines for ML models |
| **24/7 Support** | Continuous monitoring and maintenance |

### 🌟 Success Stories

- **Automated Document Processing** - 90% reduction in manual processing time
- **Intelligent Customer Support** - 60% decrease in response time
- **Predictive Maintenance** - 40% reduction in equipment downtime
- **Vision-Based Quality Control** - 99.9% defect detection accuracy

### 📬 Get in Touch

Ready to revolutionize your business with AI? Let's discuss how we can help.

<div align="center">

**🌐 Website**: [https://geekyants.com](https://geekyants.com)
**📧 Email**: [ai-consulting@geekyants.com](mailto:ai-consulting@geekyants.com)
**📱 Phone**: +1 (415) 890-5433 | +91 (804) 785-5522
**💼 LinkedIn**: [GeekyAnts](https://www.linkedin.com/company/geekyants/)

<a href="https://geekyants.com/contact" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
  Schedule a Free Consultation
</a>

</div>

### 🏢 Our Offices

**USA** - San Francisco, CA
**India** - Bangalore, Karnataka
**UK** - London

---

<div align="center">
  <sub>Built with ❤️ by GeekyAnts Engineering Team</sub>

  <br/>

  <sub>This open-source project demonstrates our commitment to advancing AI technology and sharing knowledge with the developer community.</sub>
</div>

---

**Privacy Notice**: This application runs 100% locally. No data is sent to external servers, ensuring complete privacy and control over your automation workflows. This aligns with our commitment to data security and privacy-first solutions at GeekyAnts.