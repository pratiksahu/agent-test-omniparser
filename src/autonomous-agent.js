import puppeteer from 'puppeteer';
import { LocalOmniParser } from './omniparser-local.js';
import fs from 'fs/promises';
import path from 'path';

export class AutonomousAgent {
  constructor(omniParser) {
    this.parser = omniParser;
    this.browser = null;
    this.page = null;
    this.actionHistory = [];
    this.goals = [];
    this.currentGoal = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 800 }
    });
    this.page = await this.browser.newPage();
  }

  async navigateTo(url) {
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      await this.analyzeCurrentPage();
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  }

  async captureScreenshot(name = 'screenshot') {
    const timestamp = Date.now();
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(process.cwd(), 'screenshots', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await this.page.screenshot({ path: filepath });
    
    return filepath;
  }

  async analyzeCurrentPage() {
    const screenshotPath = await this.captureScreenshot('analysis');
    const analysis = await this.parser.parseScreen(screenshotPath, {
      generateDescriptions: true,
      context: this.currentGoal?.context || 'general'
    });
    
    return {
      screenshot: screenshotPath,
      analysis,
      suggestedActions: this.generateActionPlan(analysis)
    };
  }

  generateActionPlan(analysis) {
    const actions = [];
    
    analysis.elements.interactable.forEach(element => {
      const action = {
        type: this.determineActionType(element),
        target: element,
        priority: this.calculatePriority(element),
        reasoning: this.generateReasoning(element)
      };
      actions.push(action);
    });
    
    return actions.sort((a, b) => b.priority - a.priority);
  }

  determineActionType(element) {
    if (element.type === 'button') {
      if (element.label.toLowerCase().includes('submit')) return 'submit';
      if (element.label.toLowerCase().includes('next')) return 'navigate';
      return 'click';
    }
    if (element.type === 'icon') {
      if (element.label.toLowerCase().includes('menu')) return 'expand';
      if (element.label.toLowerCase().includes('settings')) return 'configure';
      return 'click';
    }
    return 'interact';
  }

  calculatePriority(element) {
    let priority = 50;
    
    if (element.confidence > 0.9) priority += 20;
    
    if (this.currentGoal) {
      const goalKeywords = this.currentGoal.keywords || [];
      const labelLower = element.label.toLowerCase();
      
      goalKeywords.forEach(keyword => {
        if (labelLower.includes(keyword.toLowerCase())) {
          priority += 30;
        }
      });
    }
    
    if (element.type === 'button') priority += 10;
    if (element.interactable) priority += 10;
    
    return Math.min(priority, 100);
  }

  generateReasoning(element) {
    const reasons = [];
    
    if (element.confidence > 0.9) {
      reasons.push('High confidence detection');
    }
    
    if (element.interactable) {
      reasons.push('Element is interactable');
    }
    
    if (this.currentGoal && element.label.toLowerCase().includes(this.currentGoal.keyword)) {
      reasons.push(`Matches goal: ${this.currentGoal.description}`);
    }
    
    return reasons.join('; ') || 'Standard interaction';
  }

  async executeAction(action) {
    try {
      const { target } = action;
      const [x1, y1, x2, y2] = target.bbox;
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      
      switch (action.type) {
        case 'click':
        case 'submit':
        case 'navigate':
        case 'expand':
        case 'configure':
          await this.page.mouse.click(centerX, centerY);
          break;
        case 'hover':
          await this.page.mouse.move(centerX, centerY);
          break;
        default:
          console.log(`Unknown action type: ${action.type}`);
      }
      
      this.actionHistory.push({
        timestamp: new Date().toISOString(),
        action,
        success: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, action };
    } catch (error) {
      this.actionHistory.push({
        timestamp: new Date().toISOString(),
        action,
        success: false,
        error: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  async setGoal(goal) {
    this.currentGoal = {
      description: goal.description,
      keywords: goal.keywords || [],
      context: goal.context || 'general',
      maxSteps: goal.maxSteps || 10,
      currentStep: 0
    };
    this.goals.push(this.currentGoal);
  }

  async executeGoal() {
    if (!this.currentGoal) {
      throw new Error('No goal set');
    }
    
    const results = [];
    
    while (this.currentGoal.currentStep < this.currentGoal.maxSteps) {
      const pageAnalysis = await this.analyzeCurrentPage();
      
      if (pageAnalysis.suggestedActions.length === 0) {
        console.log('No more actions available');
        break;
      }
      
      const bestAction = pageAnalysis.suggestedActions[0];
      
      if (bestAction.priority < 30) {
        console.log('No high-priority actions found');
        break;
      }
      
      console.log(`Executing: ${bestAction.type} on ${bestAction.target.label}`);
      const result = await this.executeAction(bestAction);
      results.push(result);
      
      if (!result.success) {
        console.error('Action failed:', result.error);
        break;
      }
      
      this.currentGoal.currentStep++;
    }
    
    return {
      goal: this.currentGoal,
      steps: results,
      success: results.every(r => r.success)
    };
  }

  async autonomousExplore(options = {}) {
    const maxActions = options.maxActions || 5;
    const waitTime = options.waitTime || 2000;
    const exploration = [];
    
    for (let i = 0; i < maxActions; i++) {
      console.log(`\nExploration step ${i + 1}/${maxActions}`);
      
      const analysis = await this.analyzeCurrentPage();
      exploration.push({
        step: i + 1,
        analysis: analysis.analysis.summary,
        screenshot: analysis.screenshot
      });
      
      if (analysis.suggestedActions.length === 0) {
        console.log('No actions available, stopping exploration');
        break;
      }
      
      const randomAction = analysis.suggestedActions[
        Math.floor(Math.random() * Math.min(3, analysis.suggestedActions.length))
      ];
      
      console.log(`Performing: ${randomAction.type} on ${randomAction.target.label}`);
      await this.executeAction(randomAction);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    return exploration;
  }

  async identifyAndClickIcon(iconName) {
    const analysis = await this.analyzeCurrentPage();
    
    const matchingIcon = analysis.analysis.elements.icons.find(icon => 
      icon.label.toLowerCase().includes(iconName.toLowerCase())
    );
    
    if (!matchingIcon) {
      return { success: false, message: `Icon '${iconName}' not found` };
    }
    
    const action = {
      type: 'click',
      target: matchingIcon
    };
    
    return await this.executeAction(action);
  }

  async getActionHistory() {
    return this.actionHistory;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}