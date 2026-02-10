import torch
import os

model_path = 'plantify_model.pth'

if os.path.exists(model_path):
    print(f"✅ File found at: {os.path.abspath(model_path)}")
    try:
        checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
        print(f"✅ Architecture: {checkpoint.get('arch', 'unknown')}")
        print(f"✅ Classes detected: {len(checkpoint['classes'])}")
        print(f"✅ First 3 classes: {checkpoint['classes'][:3]}")
    except Exception as e:
        print(f"❌ Error loading file: {e}")
else:
    print("❌ File 'plantify_model.pth' not found in this directory.")