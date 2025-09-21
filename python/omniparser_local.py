#!/usr/bin/env python3
"""
Local OmniParser implementation using YOLOv8 and Florence-2
"""

import os
import json
import base64
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import torch
from ultralytics import YOLO
from transformers import AutoProcessor, AutoModelForCausalLM
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
import supervision as sv

class LocalOmniParser:
    def __init__(self, model_config_path: str = "models/model_config.json"):
        """Initialize OmniParser with local models"""
        print("Initializing LocalOmniParser...")
        
        # Load configuration
        with open(model_config_path, 'r') as f:
            self.config = json.load(f)
        
        self.device = self.config['device']
        print(f"Using device: {self.device}")
        
        # Initialize YOLO for detection
        self.init_yolo()
        
        # Initialize Florence-2 for captioning
        self.init_florence()
        
        print("✅ LocalOmniParser initialized successfully")
    
    def init_yolo(self):
        """Initialize YOLO model for icon detection"""
        try:
            model_path = self.config['yolo_model']
            if os.path.exists(model_path):
                self.yolo = YOLO(model_path)
            else:
                print("Using default YOLOv8 model")
                self.yolo = YOLO('yolov8m.pt')
            
            # Set to appropriate device
            if self.device == 'cuda':
                self.yolo.to('cuda')
            
            print("✅ YOLO model loaded")
        except Exception as e:
            print(f"Error loading YOLO: {e}")
            self.yolo = None
    
    def init_florence(self):
        """Initialize Florence-2 model for caption generation"""
        try:
            model_path = self.config['florence_model']
            if os.path.exists(model_path):
                self.processor = AutoProcessor.from_pretrained(model_path, trust_remote_code=True)
                self.florence_model = AutoModelForCausalLM.from_pretrained(
                    model_path,
                    torch_dtype=torch.float16 if self.device == 'cuda' else torch.float32,
                    trust_remote_code=True
                ).to(self.device)
                print("✅ Florence-2 model loaded")
            else:
                print("⚠️  Florence-2 model not found, caption generation disabled")
                self.processor = None
                self.florence_model = None
        except Exception as e:
            print(f"Error loading Florence-2: {e}")
            self.processor = None
            self.florence_model = None
    
    def detect_elements(self, image_path: str) -> Dict[str, Any]:
        """Detect UI elements in the image"""
        image = cv2.imread(image_path)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        results = {
            'icons': [],
            'buttons': [],
            'text': [],
            'interactable': [],
            'all_elements': []
        }
        
        if self.yolo:
            # Run YOLO detection
            detections = self.yolo(image_rgb, 
                                 conf=self.config['configs']['confidence_threshold'],
                                 iou=self.config['configs']['iou_threshold'])[0]
            
            # Process detections
            for i, box in enumerate(detections.boxes):
                if box.conf[0] < self.config['configs']['confidence_threshold']:
                    continue
                
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = box.conf[0].item()
                cls = int(box.cls[0].item())
                
                # Classify element type based on YOLO class or heuristics
                element_type = self.classify_element(image_rgb, (x1, y1, x2, y2), cls)
                
                element = {
                    'id': f'element_{i}',
                    'type': element_type,
                    'bbox': [int(x1), int(y1), int(x2), int(y2)],
                    'confidence': float(conf),
                    'center': [int((x1+x2)/2), int((y1+y2)/2)],
                    'area': int((x2-x1) * (y2-y1)),
                    'interactable': element_type in ['button', 'icon', 'input', 'link']
                }
                
                # Generate caption if Florence is available
                if self.florence_model and element['interactable']:
                    element['label'] = self.generate_caption(image_rgb, element['bbox'])
                else:
                    element['label'] = f"{element_type}_{i}"
                
                # Categorize element
                results['all_elements'].append(element)
                
                if element_type == 'icon':
                    results['icons'].append(element)
                elif element_type == 'button':
                    results['buttons'].append(element)
                elif element_type == 'text':
                    results['text'].append(element)
                
                if element['interactable']:
                    results['interactable'].append(element)
        
        # If no YOLO, use basic detection
        if not results['all_elements']:
            results = self.basic_detection(image_rgb)
        
        return results
    
    def classify_element(self, image: np.ndarray, bbox: Tuple, cls: int) -> str:
        """Classify UI element type based on visual features"""
        x1, y1, x2, y2 = map(int, bbox)
        roi = image[y1:y2, x1:x2]
        
        if roi.size == 0:
            return 'unknown'
        
        # Calculate aspect ratio
        aspect_ratio = (x2 - x1) / (y2 - y1) if (y2 - y1) > 0 else 1
        
        # Calculate area
        area = (x2 - x1) * (y2 - y1)
        
        # Simple heuristics for classification
        if area < 2500:  # Small elements
            return 'icon'
        elif aspect_ratio > 2.5:  # Wide elements
            return 'button'
        elif aspect_ratio < 0.5:  # Tall elements
            return 'sidebar'
        else:
            # Check for text-like patterns
            gray_roi = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray_roi, 50, 150)
            edge_density = np.sum(edges) / (edges.shape[0] * edges.shape[1])
            
            if edge_density > 30:
                return 'text'
            else:
                return 'button'
    
    def generate_caption(self, image: np.ndarray, bbox: List[int]) -> str:
        """Generate caption for UI element using Florence-2"""
        if not self.florence_model:
            return "element"
        
        try:
            x1, y1, x2, y2 = bbox
            # Crop the element
            element_crop = image[y1:y2, x1:x2]
            
            # Convert to PIL Image
            pil_image = Image.fromarray(element_crop)
            
            # Prepare prompt for Florence
            prompt = "<CAPTION>"
            
            inputs = self.processor(text=prompt, images=pil_image, return_tensors="pt").to(self.device)
            
            # Generate caption
            with torch.no_grad():
                generated_ids = self.florence_model.generate(
                    **inputs,
                    max_new_tokens=20,
                    do_sample=False
                )
            
            generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            # Extract caption from response
            caption = generated_text.replace(prompt, "").strip()
            return caption if caption else "UI element"
        
        except Exception as e:
            print(f"Caption generation error: {e}")
            return "element"
    
    def basic_detection(self, image: np.ndarray) -> Dict[str, Any]:
        """Basic UI detection using traditional CV when models are not available"""
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        results = {
            'icons': [],
            'buttons': [],
            'text': [],
            'interactable': [],
            'all_elements': []
        }
        
        for i, contour in enumerate(contours[:50]):  # Limit to 50 elements
            x, y, w, h = cv2.boundingRect(contour)
            
            # Filter small contours
            if w < 20 or h < 20:
                continue
            
            aspect_ratio = w / h if h > 0 else 1
            area = w * h
            
            # Classify based on heuristics
            if area < 2500:
                element_type = 'icon'
            elif aspect_ratio > 2.5:
                element_type = 'button'
            else:
                element_type = 'text'
            
            element = {
                'id': f'element_{i}',
                'type': element_type,
                'bbox': [x, y, x+w, y+h],
                'confidence': 0.5,  # Fixed confidence for basic detection
                'center': [x + w//2, y + h//2],
                'area': area,
                'label': f"{element_type}_{i}",
                'interactable': element_type in ['button', 'icon']
            }
            
            results['all_elements'].append(element)
            
            if element_type == 'icon':
                results['icons'].append(element)
            elif element_type == 'button':
                results['buttons'].append(element)
            elif element_type == 'text':
                results['text'].append(element)
            
            if element['interactable']:
                results['interactable'].append(element)
        
        return results
    
    def visualize_detections(self, image_path: str, detections: Dict[str, Any], output_path: str = None):
        """Visualize detected elements on the image"""
        image = Image.open(image_path)
        draw = ImageDraw.Draw(image)
        
        # Try to load a font
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
        except:
            font = ImageFont.load_default()
        
        colors = {
            'icon': '#FF6B6B',
            'button': '#4ECDC4',
            'text': '#45B7D1',
            'unknown': '#95A5A6'
        }
        
        for element in detections['all_elements']:
            bbox = element['bbox']
            element_type = element['type']
            color = colors.get(element_type, '#95A5A6')
            
            # Draw bounding box
            draw.rectangle(bbox, outline=color, width=2)
            
            # Draw label with background
            label = f"{element['id']}: {element['label'][:20]}"
            text_bbox = draw.textbbox((bbox[0], bbox[1]-20), label, font=font)
            draw.rectangle(text_bbox, fill=color)
            draw.text((bbox[0], bbox[1]-20), label, fill='white', font=font)
            
            # Draw confidence
            conf_text = f"{element['confidence']:.2f}"
            draw.text((bbox[0], bbox[3]+5), conf_text, fill=color, font=font)
        
        if output_path:
            image.save(output_path)
        
        return image
    
    def parse_screen(self, image_path: str, visualize: bool = False) -> Dict[str, Any]:
        """Complete screen parsing pipeline"""
        # Detect elements
        detections = self.detect_elements(image_path)
        
        # Calculate summary statistics
        summary = {
            'total_elements': len(detections['all_elements']),
            'interactable_count': len(detections['interactable']),
            'icon_count': len(detections['icons']),
            'button_count': len(detections['buttons']),
            'text_count': len(detections['text'])
        }
        
        # Analyze layout
        layout = self.analyze_layout(detections['all_elements'])
        
        result = {
            'image_path': image_path,
            'summary': summary,
            'elements': detections,
            'layout': layout
        }
        
        # Generate visualization if requested
        if visualize:
            viz_path = image_path.replace('.', '_annotated.')
            self.visualize_detections(image_path, detections, viz_path)
            result['visualization'] = viz_path
        
        return result
    
    def analyze_layout(self, elements: List[Dict]) -> Dict[str, Any]:
        """Analyze the layout of detected elements"""
        if not elements:
            return {'type': 'empty', 'regions': {}}
        
        # Get image dimensions from largest bbox
        max_x = max(e['bbox'][2] for e in elements)
        max_y = max(e['bbox'][3] for e in elements)
        
        # Divide into regions
        regions = {
            'top': [],
            'middle': [],
            'bottom': [],
            'left': [],
            'center': [],
            'right': []
        }
        
        for element in elements:
            cx, cy = element['center']
            
            # Vertical regions
            if cy < max_y / 3:
                regions['top'].append(element['id'])
            elif cy < 2 * max_y / 3:
                regions['middle'].append(element['id'])
            else:
                regions['bottom'].append(element['id'])
            
            # Horizontal regions
            if cx < max_x / 3:
                regions['left'].append(element['id'])
            elif cx < 2 * max_x / 3:
                regions['center'].append(element['id'])
            else:
                regions['right'].append(element['id'])
        
        # Determine layout type
        layout_type = 'balanced'
        if len(regions['top']) > len(regions['middle']) + len(regions['bottom']):
            layout_type = 'header-heavy'
        elif len(regions['bottom']) > len(regions['top']) + len(regions['middle']):
            layout_type = 'footer-heavy'
        elif len(regions['left']) > len(regions['center']) + len(regions['right']):
            layout_type = 'sidebar-left'
        elif len(regions['right']) > len(regions['center']) + len(regions['left']):
            layout_type = 'sidebar-right'
        
        return {
            'type': layout_type,
            'regions': regions,
            'density': self.calculate_density(len(elements))
        }
    
    def calculate_density(self, element_count: int) -> str:
        """Calculate UI density"""
        if element_count == 0:
            return 'empty'
        elif element_count < 10:
            return 'sparse'
        elif element_count < 30:
            return 'moderate'
        else:
            return 'dense'

# Flask API Server
app = Flask(__name__)
CORS(app)

# Initialize parser
parser = None

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model_loaded': parser is not None})

@app.route('/parse', methods=['POST'])
def parse_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        image = request.files['image']
        image_path = f"temp_{image.filename}"
        image.save(image_path)
        
        # Parse the image
        visualize = request.form.get('visualize', 'false').lower() == 'true'
        result = parser.parse_screen(image_path, visualize=visualize)
        
        # Clean up
        os.remove(image_path)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/detect', methods=['POST'])
def detect_elements():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        image = request.files['image']
        image_path = f"temp_{image.filename}"
        image.save(image_path)
        
        # Detect elements
        detections = parser.detect_elements(image_path)
        
        # Clean up
        os.remove(image_path)
        
        return jsonify(detections)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print("   OmniParser Local Server")
    print("="*50)
    
    # Initialize parser
    parser = LocalOmniParser()
    
    print("\n🚀 Starting Flask server on port 5001...")
    print("📍 API Endpoints:")
    print("   GET  /health - Check server status")
    print("   POST /parse - Parse UI screenshot")
    print("   POST /detect - Detect UI elements")
    print("\n")
    
    app.run(host='0.0.0.0', port=5001, debug=False)