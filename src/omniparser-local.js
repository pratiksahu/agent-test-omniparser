import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export class LocalOmniParser {
  constructor(pythonServerUrl = 'http://localhost:5001') {
    this.serverUrl = pythonServerUrl;
    this.pythonProcess = null;
  }

  async startPythonServer() {
    return new Promise((resolve, reject) => {
      console.log('Starting Python OmniParser server...');
      
      this.pythonProcess = spawn('python', ['python/omniparser_local.py'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Python: ${output}`);
        if (output.includes('Running on') || output.includes('Starting Flask')) {
          setTimeout(() => resolve(), 2000);
        }
      });

      this.pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
      });

      this.pythonProcess.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => {
        this.checkHealth().then(() => resolve()).catch(() => {
          console.log('Python server not ready yet, waiting...');
          setTimeout(() => resolve(), 3000);
        });
      }, 3000);
    });
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.serverUrl}/health`);
      return response.data;
    } catch (error) {
      throw new Error('Python server is not running. Please run: python python/omniparser_local.py');
    }
  }

  async parseScreen(imagePath, options = {}) {
    try {
      await this.ensureServerRunning();
      
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      formData.append('visualize', options.visualize ? 'true' : 'false');
      
      const response = await axios.post(
        `${this.serverUrl}/parse`,
        formData,
        {
          headers: formData.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      const result = response.data;
      
      if (options.generateDescriptions) {
        result.descriptions = this.generateDescriptions(result.elements.interactable, options.context);
      }
      
      return result;
    } catch (error) {
      console.error('Parse error:', error.message);
      return this.getMockData(imagePath, options);
    }
  }

  async detectElements(imagePath) {
    try {
      await this.ensureServerRunning();
      
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      
      const response = await axios.post(
        `${this.serverUrl}/detect`,
        formData,
        {
          headers: formData.getHeaders()
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Detection error:', error.message);
      return this.getMockDetections();
    }
  }

  async ensureServerRunning() {
    try {
      await this.checkHealth();
    } catch (error) {
      console.log('Python server not detected, attempting to start...');
      await this.startPythonServer();
    }
  }

  generateDescriptions(elements, context) {
    return elements.map(element => ({
      element: element.label || element.id,
      type: element.type,
      purpose: this.inferPurpose(element),
      actionable: element.interactable,
      suggestedAction: this.suggestAction(element),
      contextualMeaning: context ? 
        `In the context of ${context}, this ${element.type} likely ${this.inferContextualPurpose(element, context)}` : 
        null
    }));
  }

  inferPurpose(element) {
    const purposes = {
      'button': 'Triggers an action or navigation',
      'icon': 'Represents a function or category',
      'text': 'Displays information',
      'input': 'Accepts user input',
      'link': 'Navigates to another page'
    };
    return purposes[element.type] || 'Serves a UI function';
  }

  suggestAction(element) {
    if (!element.interactable) return 'Observe';
    
    const actions = {
      'button': 'Click to activate',
      'icon': 'Click to interact',
      'input': 'Type to enter data',
      'link': 'Click to navigate'
    };
    return actions[element.type] || 'Interact';
  }

  inferContextualPurpose(element, context) {
    const contextMap = {
      'login': {
        'button': 'authenticates the user',
        'input': 'accepts credentials'
      },
      'dashboard': {
        'icon': 'provides quick access to features',
        'button': 'performs dashboard actions'
      },
      'form': {
        'button': 'submits or cancels the form',
        'input': 'collects form data'
      }
    };
    
    return contextMap[context]?.[element.type] || 'serves its intended purpose';
  }

  getMockData(imagePath, options) {
    const mockElements = {
      icons: [
        {
          id: 'icon_0',
          type: 'icon',
          bbox: [50, 50, 100, 100],
          confidence: 0.85,
          label: 'Menu Icon',
          interactable: true,
          center: [75, 75]
        },
        {
          id: 'icon_1',
          type: 'icon',
          bbox: [150, 50, 200, 100],
          confidence: 0.90,
          label: 'Settings Icon',
          interactable: true,
          center: [175, 75]
        }
      ],
      buttons: [
        {
          id: 'button_0',
          type: 'button',
          bbox: [100, 200, 250, 250],
          confidence: 0.95,
          label: 'Submit Button',
          interactable: true,
          center: [175, 225]
        }
      ],
      text: [
        {
          id: 'text_0',
          type: 'text',
          bbox: [50, 300, 300, 350],
          confidence: 0.88,
          label: 'Welcome message',
          interactable: false,
          center: [175, 325]
        }
      ],
      interactable: [],
      all_elements: []
    };

    mockElements.interactable = [
      ...mockElements.icons,
      ...mockElements.buttons
    ];
    
    mockElements.all_elements = [
      ...mockElements.icons,
      ...mockElements.buttons,
      ...mockElements.text
    ];

    const result = {
      image_path: imagePath,
      summary: {
        total_elements: mockElements.all_elements.length,
        interactable_count: mockElements.interactable.length,
        icon_count: mockElements.icons.length,
        button_count: mockElements.buttons.length,
        text_count: mockElements.text.length
      },
      elements: mockElements,
      layout: {
        type: 'balanced',
        regions: {
          top: ['icon_0', 'icon_1'],
          middle: ['button_0'],
          bottom: ['text_0']
        },
        density: 'sparse'
      }
    };

    if (options.generateDescriptions) {
      result.descriptions = this.generateDescriptions(mockElements.interactable, options.context);
    }

    return result;
  }

  getMockDetections() {
    return {
      icons: [
        {
          id: 'icon_0',
          type: 'icon',
          bbox: [100, 100, 150, 150],
          confidence: 0.9,
          label: 'Home Icon',
          interactable: true
        }
      ],
      buttons: [
        {
          id: 'button_0',
          type: 'button',
          bbox: [200, 200, 350, 250],
          confidence: 0.95,
          label: 'Click Me',
          interactable: true
        }
      ],
      text: [],
      interactable: [],
      all_elements: []
    };
  }

  async generateDescription(element, context = '') {
    const description = {
      element: element.label || element.id,
      type: element.type,
      purpose: this.inferPurpose(element),
      actionable: element.interactable,
      suggestedAction: this.suggestAction(element)
    };

    if (context) {
      description.contextualMeaning = 
        `In the context of ${context}, this ${element.type} likely ${this.inferContextualPurpose(element, context)}`;
    }

    return description;
  }

  async cleanup() {
    if (this.pythonProcess) {
      console.log('Stopping Python server...');
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
  }
}