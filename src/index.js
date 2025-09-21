import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { LocalOmniParser } from './omniparser-local.js';
import { AutonomousAgent } from './autonomous-agent.js';
import fs from 'fs/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.static('public'));

const omniParser = new LocalOmniParser();
let autonomousAgent = null;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>OmniParser Autonomous App</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        .subtitle {
          color: #666;
          margin-bottom: 30px;
        }
        .section {
          margin: 30px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .endpoint {
          background: white;
          padding: 15px;
          margin: 10px 0;
          border-radius: 6px;
          border-left: 4px solid #667eea;
        }
        .method {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 12px;
          margin-right: 10px;
        }
        .post { background: #28a745; color: white; }
        .get { background: #007bff; color: white; }
        .path {
          font-family: 'Courier New', monospace;
          color: #495057;
        }
        .description {
          color: #6c757d;
          margin-top: 8px;
          font-size: 14px;
        }
        .demo-button {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          transition: transform 0.2s;
        }
        .demo-button:hover {
          transform: translateY(-2px);
        }
        .feature {
          display: inline-block;
          background: #e9ecef;
          padding: 6px 12px;
          border-radius: 20px;
          margin: 5px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 OmniParser Autonomous App</h1>
        <p class="subtitle">Advanced UI parsing and autonomous navigation powered by OmniParser v2</p>
        
        <div class="section">
          <h2>✨ Features</h2>
          <div>
            <span class="feature">Icon Detection</span>
            <span class="feature">Button Recognition</span>
            <span class="feature">Autonomous Navigation</span>
            <span class="feature">Screen Analysis</span>
            <span class="feature">Goal-Driven Actions</span>
            <span class="feature">Layout Understanding</span>
          </div>
        </div>

        <div class="section">
          <h2>🔌 API Endpoints</h2>
          
          <div class="endpoint">
            <span class="method post">POST</span>
            <span class="path">/api/parse-image</span>
            <p class="description">Upload an image to detect icons, buttons, and UI elements</p>
          </div>
          
          <div class="endpoint">
            <span class="method post">POST</span>
            <span class="path">/api/autonomous/start</span>
            <p class="description">Start autonomous browser agent with a target URL</p>
          </div>
          
          <div class="endpoint">
            <span class="method post">POST</span>
            <span class="path">/api/autonomous/goal</span>
            <p class="description">Set a goal for the autonomous agent to achieve</p>
          </div>
          
          <div class="endpoint">
            <span class="method post">POST</span>
            <span class="path">/api/autonomous/explore</span>
            <p class="description">Let the agent explore autonomously</p>
          </div>
          
          <div class="endpoint">
            <span class="method post">POST</span>
            <span class="path">/api/autonomous/click-icon</span>
            <p class="description">Identify and click a specific icon by name</p>
          </div>
          
          <div class="endpoint">
            <span class="method get">GET</span>
            <span class="path">/api/autonomous/history</span>
            <p class="description">Get the action history of the autonomous agent</p>
          </div>
          
          <div class="endpoint">
            <span class="method post">POST</span>
            <span class="path">/api/autonomous/stop</span>
            <p class="description">Stop the autonomous agent</p>
          </div>
        </div>

        <div class="section">
          <h2>🚀 Quick Demo</h2>
          <p>Try the autonomous agent with a simple example:</p>
          <button class="demo-button" onclick="runDemo()">Run Demo</button>
          <div id="demo-result"></div>
        </div>
      </div>

      <script>
        async function runDemo() {
          const resultDiv = document.getElementById('demo-result');
          resultDiv.innerHTML = '<p>Starting demo...</p>';
          
          try {
            const response = await fetch('/api/demo');
            const data = await response.json();
            resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            resultDiv.innerHTML = '<p style="color: red;">Error: ' + error.message + '</p>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.post('/api/parse-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await omniParser.parseScreen(req.file.path, {
      generateDescriptions: true,
      context: req.body.context || 'general'
    });

    await fs.unlink(req.file.path);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/autonomous/start', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (autonomousAgent) {
      await autonomousAgent.cleanup();
    }

    autonomousAgent = new AutonomousAgent(omniParser);
    await autonomousAgent.initialize();
    await autonomousAgent.navigateTo(url);

    res.json({ 
      success: true, 
      message: 'Autonomous agent started',
      url 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/autonomous/goal', async (req, res) => {
  try {
    if (!autonomousAgent) {
      return res.status(400).json({ error: 'Agent not initialized' });
    }

    const { description, keywords, context, maxSteps } = req.body;
    
    await autonomousAgent.setGoal({
      description,
      keywords,
      context,
      maxSteps
    });

    const result = await autonomousAgent.executeGoal();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/autonomous/explore', async (req, res) => {
  try {
    if (!autonomousAgent) {
      return res.status(400).json({ error: 'Agent not initialized' });
    }

    const { maxActions, waitTime } = req.body;
    const exploration = await autonomousAgent.autonomousExplore({
      maxActions: maxActions || 5,
      waitTime: waitTime || 2000
    });

    res.json({ success: true, exploration });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/autonomous/click-icon', async (req, res) => {
  try {
    if (!autonomousAgent) {
      return res.status(400).json({ error: 'Agent not initialized' });
    }

    const { iconName } = req.body;
    
    if (!iconName) {
      return res.status(400).json({ error: 'Icon name is required' });
    }

    const result = await autonomousAgent.identifyAndClickIcon(iconName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/autonomous/history', async (req, res) => {
  try {
    if (!autonomousAgent) {
      return res.status(400).json({ error: 'Agent not initialized' });
    }

    const history = await autonomousAgent.getActionHistory();
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/autonomous/stop', async (req, res) => {
  try {
    if (!autonomousAgent) {
      return res.status(400).json({ error: 'Agent not initialized' });
    }

    await autonomousAgent.cleanup();
    autonomousAgent = null;

    res.json({ success: true, message: 'Agent stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/demo', async (req, res) => {
  try {
    const demoImagePath = path.join(__dirname, '..', 'demo', 'sample.png');
    
    await fs.mkdir(path.dirname(demoImagePath), { recursive: true });
    
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 800, 600);
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(100, 100, 150, 50);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Submit', 145, 135);
    
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(300, 100, 50, 50);
    ctx.fillStyle = 'white';
    ctx.fillText('⚙', 315, 135);
    
    ctx.fillStyle = '#FF9800';
    ctx.fillRect(400, 100, 50, 50);
    ctx.fillStyle = 'white';
    ctx.fillText('☰', 415, 135);
    
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(demoImagePath, buffer);
    
    const result = await omniParser.parseScreen(demoImagePath, {
      generateDescriptions: true,
      context: 'demo'
    });

    res.json({
      message: 'Demo analysis complete',
      result
    });
  } catch (error) {
    const mockResult = await omniParser.parseScreen('demo.png', {
      generateDescriptions: true,
      context: 'demo'
    });
    
    res.json({
      message: 'Demo with mock data',
      result: mockResult
    });
  }
});

app.listen(port, () => {
  console.log(`\n🚀 OmniParser Autonomous App is running!`);
  console.log(`📍 Local: http://localhost:${port}`);
  console.log(`\n📚 Available endpoints:`);
  console.log(`   POST /api/parse-image - Parse UI screenshot`);
  console.log(`   POST /api/autonomous/start - Start autonomous agent`);
  console.log(`   POST /api/autonomous/goal - Set and execute goal`);
  console.log(`   POST /api/autonomous/explore - Autonomous exploration`);
  console.log(`   POST /api/autonomous/click-icon - Click specific icon`);
  console.log(`   GET  /api/autonomous/history - Get action history`);
  console.log(`   POST /api/autonomous/stop - Stop agent`);
  console.log(`   GET  /api/demo - Run demo analysis\n`);
});

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (autonomousAgent) {
    await autonomousAgent.cleanup();
  }
  process.exit(0);
});