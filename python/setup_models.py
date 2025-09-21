#!/usr/bin/env python3
"""
Setup script to download and prepare OmniParser models for local execution
"""

import os
import sys
import torch
from pathlib import Path
from huggingface_hub import snapshot_download, hf_hub_download
import requests
from tqdm import tqdm

def create_directories():
    """Create necessary directories for models and outputs"""
    dirs = [
        'models',
        'models/omniparser',
        'models/yolo',
        'models/florence',
        'outputs',
        'screenshots',
        'cache'
    ]
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"✓ Created directory: {dir_path}")

def download_yolo_model():
    """Download YOLOv8 model for icon detection"""
    print("\n📦 Downloading YOLOv8 model for icon detection...")
    try:
        # Download OmniParser's fine-tuned YOLOv8 model
        model_path = hf_hub_download(
            repo_id="microsoft/OmniParser",
            filename="icon_detect/model.pt",
            local_dir="models/omniparser",
            local_dir_use_symlinks=False
        )
        print(f"✓ YOLOv8 model downloaded to: {model_path}")
        return model_path
    except Exception as e:
        print(f"⚠️  Could not download from HuggingFace, using fallback YOLOv8...")
        # Fallback to standard YOLOv8
        from ultralytics import YOLO
        model = YOLO('yolov8m.pt')
        model.save('models/yolo/yolov8m.pt')
        return 'models/yolo/yolov8m.pt'

def download_florence_model():
    """Download Florence-2 model for caption generation"""
    print("\n📦 Downloading Florence-2 model for caption generation...")
    try:
        # Download Florence-2 base model
        model_path = snapshot_download(
            repo_id="microsoft/Florence-2-base",
            local_dir="models/florence",
            local_dir_use_symlinks=False,
            ignore_patterns=["*.md", "*.txt"]
        )
        print(f"✓ Florence-2 model downloaded to: {model_path}")
        return model_path
    except Exception as e:
        print(f"⚠️  Error downloading Florence-2: {e}")
        return None

def download_omniparser_configs():
    """Download OmniParser configuration files"""
    print("\n📦 Downloading OmniParser configurations...")
    configs = [
        "config/config.yaml",
        "weights/icon_detect/best.pt",
        "weights/icon_caption_florence/model.safetensors"
    ]
    
    base_url = "https://huggingface.co/microsoft/OmniParser/resolve/main/"
    
    for config_file in configs:
        try:
            url = base_url + config_file
            output_path = Path("models/omniparser") / config_file
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            response = requests.get(url, stream=True)
            if response.status_code == 200:
                total_size = int(response.headers.get('content-length', 0))
                with open(output_path, 'wb') as f:
                    with tqdm(total=total_size, unit='B', unit_scale=True, desc=config_file) as pbar:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                            pbar.update(len(chunk))
                print(f"✓ Downloaded: {config_file}")
            else:
                print(f"⚠️  Could not download: {config_file}")
        except Exception as e:
            print(f"⚠️  Error downloading {config_file}: {e}")

def verify_cuda():
    """Check CUDA availability"""
    print("\n🔍 Checking CUDA availability...")
    if torch.cuda.is_available():
        print(f"✓ CUDA is available")
        print(f"  Device: {torch.cuda.get_device_name(0)}")
        print(f"  CUDA Version: {torch.version.cuda}")
        return True
    else:
        print("⚠️  CUDA is not available, will use CPU (slower performance)")
        return False

def create_model_info():
    """Create a JSON file with model paths and configuration"""
    import json
    
    model_info = {
        "yolo_model": "models/omniparser/icon_detect/model.pt",
        "florence_model": "models/florence",
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "configs": {
            "confidence_threshold": 0.3,
            "iou_threshold": 0.45,
            "max_detections": 100,
            "input_size": 640
        }
    }
    
    with open('models/model_config.json', 'w') as f:
        json.dump(model_info, f, indent=2)
    print("\n✓ Created model configuration file")

def main():
    print("="*50)
    print("   OmniParser Local Setup")
    print("="*50)
    
    # Create directories
    create_directories()
    
    # Check CUDA
    has_cuda = verify_cuda()
    
    # Download models
    yolo_path = download_yolo_model()
    florence_path = download_florence_model()
    
    # Download configs
    download_omniparser_configs()
    
    # Create configuration
    create_model_info()
    
    print("\n" + "="*50)
    print("✅ Setup completed successfully!")
    print("="*50)
    print("\nNext steps:")
    print("1. Run: python python/omniparser_local.py")
    print("2. Start the Node.js server: npm start")
    print("3. Access the app at: http://localhost:3000")
    
    if not has_cuda:
        print("\n💡 Tip: For better performance, consider using a GPU-enabled environment")

if __name__ == "__main__":
    main()