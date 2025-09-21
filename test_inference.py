#!/usr/bin/env python3
import requests
from PIL import Image, ImageDraw, ImageFont
import io

# Create a test image
image = Image.new('RGB', (800, 600), color='white')
draw = ImageDraw.Draw(image)

# Draw some UI elements
# Button
draw.rectangle([100, 100, 300, 150], fill='#4CAF50', outline='#45a049', width=2)
draw.text((150, 115), 'Submit', fill='white', font=None)

# Icons
draw.rectangle([400, 100, 450, 150], fill='#2196F3', outline='#1976D2', width=2)
draw.text((415, 115), 'S', fill='white', font=None)  # Settings icon

draw.rectangle([500, 100, 550, 150], fill='#FF9800', outline='#F57C00', width=2)
draw.text((515, 115), 'M', fill='white', font=None)  # Menu icon

# Text field
draw.rectangle([100, 200, 400, 240], fill='#f0f0f0', outline='#cccccc', width=1)
draw.text((110, 210), 'Enter your email', fill='#666666', font=None)

# Save the test image
image.save('test_ui.png')
print('✅ Created test_ui.png')

# Test the inference
with open('test_ui.png', 'rb') as f:
    files = {'image': f}
    response = requests.post('http://localhost:5001/detect', files=files)
    
    if response.status_code == 200:
        result = response.json()
        print('\n📊 Detection Results:')
        print(f"  - Total elements: {len(result.get('all_elements', []))}")
        print(f"  - Icons detected: {len(result.get('icons', []))}")
        print(f"  - Buttons detected: {len(result.get('buttons', []))}")
        print(f"  - Text elements: {len(result.get('text', []))}")
        print(f"  - Interactable elements: {len(result.get('interactable', []))}")
        
        print('\n🎯 Detected Elements:')
        for elem in result.get('all_elements', []):
            print(f"  - {elem['type']}: {elem['label']} (confidence: {elem['confidence']:.2f})")
    else:
        print(f'❌ Error: {response.status_code}')
        print(response.text)