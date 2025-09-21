import { HfInference } from '@huggingface/inference';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export class OmniParser {
  constructor(hfToken) {
    this.hf = new HfInference(hfToken);
    this.modelDetection = 'microsoft/OmniParser-v2.0';
    this.modelDescription = 'microsoft/OmniParser-florence2';
  }

  async preprocessImage(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const metadata = await sharp(imageBuffer).metadata();
      
      const processedImage = await sharp(imageBuffer)
        .resize(1024, 1024, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 95 })
        .toBuffer();

      return {
        buffer: processedImage,
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      throw new Error(`Failed to preprocess image: ${error.message}`);
    }
  }

  async detectElements(imagePath) {
    try {
      const { buffer } = await this.preprocessImage(imagePath);
      
      const detections = {
        icons: [],
        buttons: [],
        text: [],
        interactable: []
      };

      const mockDetections = [
        {
          type: 'button',
          bbox: [100, 100, 200, 150],
          confidence: 0.95,
          label: 'Submit Button',
          interactable: true
        },
        {
          type: 'icon',
          bbox: [250, 100, 300, 150],
          confidence: 0.88,
          label: 'Settings Icon',
          interactable: true
        },
        {
          type: 'text',
          bbox: [50, 200, 300, 250],
          confidence: 0.92,
          label: 'Welcome Text',
          content: 'Welcome to the application',
          interactable: false
        },
        {
          type: 'icon',
          bbox: [400, 100, 450, 150],
          confidence: 0.90,
          label: 'Menu Icon',
          interactable: true
        }
      ];

      mockDetections.forEach(detection => {
        if (detection.type === 'icon') {
          detections.icons.push(detection);
        } else if (detection.type === 'button') {
          detections.buttons.push(detection);
        } else if (detection.type === 'text') {
          detections.text.push(detection);
        }
        
        if (detection.interactable) {
          detections.interactable.push(detection);
        }
      });

      return detections;
    } catch (error) {
      throw new Error(`Element detection failed: ${error.message}`);
    }
  }

  async generateDescription(element, context = '') {
    try {
      const description = {
        element: element.label,
        type: element.type,
        purpose: this.inferPurpose(element),
        actionable: element.interactable,
        suggestedAction: this.suggestAction(element)
      };

      if (context) {
        description.contextualMeaning = `In the context of ${context}, this ${element.type} likely ${this.inferContextualPurpose(element, context)}`;
      }

      return description;
    } catch (error) {
      throw new Error(`Description generation failed: ${error.message}`);
    }
  }

  inferPurpose(element) {
    const purposes = {
      'Submit Button': 'Submits a form or confirms an action',
      'Settings Icon': 'Opens settings or configuration panel',
      'Menu Icon': 'Reveals navigation menu or additional options',
      'Welcome Text': 'Provides greeting or introductory information'
    };
    return purposes[element.label] || 'Performs a UI interaction';
  }

  suggestAction(element) {
    if (!element.interactable) return 'Read or observe';
    
    const actions = {
      'button': 'Click to trigger action',
      'icon': 'Click to navigate or toggle',
      'text': 'Read for information'
    };
    return actions[element.type] || 'Interact with element';
  }

  inferContextualPurpose(element, context) {
    const contextMap = {
      'login': {
        'Submit Button': 'authenticates the user',
        'Settings Icon': 'adjusts login preferences'
      },
      'dashboard': {
        'Menu Icon': 'provides navigation to different sections',
        'Settings Icon': 'customizes dashboard view'
      }
    };

    return contextMap[context]?.[element.label] || 'serves a functional purpose';
  }

  async parseScreen(imagePath, options = {}) {
    try {
      const elements = await this.detectElements(imagePath);
      
      const parsed = {
        timestamp: new Date().toISOString(),
        imagePath,
        summary: {
          totalElements: Object.values(elements).flat().length,
          interactableCount: elements.interactable.length,
          iconCount: elements.icons.length,
          buttonCount: elements.buttons.length,
          textCount: elements.text.length
        },
        elements,
        layout: this.analyzeLayout(elements)
      };

      if (options.generateDescriptions) {
        parsed.descriptions = [];
        for (const element of elements.interactable) {
          const desc = await this.generateDescription(element, options.context);
          parsed.descriptions.push(desc);
        }
      }

      return parsed;
    } catch (error) {
      throw new Error(`Screen parsing failed: ${error.message}`);
    }
  }

  analyzeLayout(elements) {
    const allElements = Object.values(elements).flat();
    
    if (allElements.length === 0) {
      return { type: 'empty', regions: [] };
    }

    const regions = {
      top: [],
      middle: [],
      bottom: []
    };

    allElements.forEach(element => {
      const y = element.bbox[1];
      if (y < 200) regions.top.push(element);
      else if (y < 400) regions.middle.push(element);
      else regions.bottom.push(element);
    });

    return {
      type: this.determineLayoutType(regions),
      regions,
      density: this.calculateDensity(allElements)
    };
  }

  determineLayoutType(regions) {
    const topCount = regions.top.length;
    const middleCount = regions.middle.length;
    const bottomCount = regions.bottom.length;

    if (topCount > middleCount && topCount > bottomCount) return 'header-heavy';
    if (bottomCount > topCount && bottomCount > middleCount) return 'footer-heavy';
    if (middleCount > topCount && middleCount > bottomCount) return 'content-centered';
    return 'balanced';
  }

  calculateDensity(elements) {
    if (elements.length === 0) return 'empty';
    if (elements.length < 5) return 'sparse';
    if (elements.length < 15) return 'moderate';
    return 'dense';
  }
}