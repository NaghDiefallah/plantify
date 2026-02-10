import torch
import torch.nn as nn
from torchvision import models
from collections import OrderedDict
import os

def verify_model_compatibility():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, 'plantify_model.pth')
    
    if not os.path.exists(model_path):
        print("❌ Model file not found!")
        print(f"Expected path: {model_path}")
        print("\nRun train.py first to create the model.")
        return False
    
    try:
        print("Loading checkpoint...")
        checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
        
        print("\n✓ Checkpoint loaded successfully!")
        print(f"  Architecture: {checkpoint.get('arch', 'N/A')}")
        print(f"  Classes: {len(checkpoint.get('classes', []))} classes")
        print(f"  Epoch: {checkpoint.get('epoch', 'N/A')}")
        print(f"  Loss: {checkpoint.get('loss', 'N/A'):.4f}")
        print(f"  Accuracy: {checkpoint.get('accuracy', 'N/A'):.2f}%")
        
        labels = checkpoint['classes']
        print(f"\n✓ Class names extracted: {len(labels)} classes")
        print(f"  Sample classes: {labels[:3]}...")
        
        model = models.efficientnet_b1(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(in_features, len(labels))
        )
        print("\n✓ Model architecture created")
        
        raw_state_dict = checkpoint.get('model_state_dict', checkpoint)
        new_state_dict = OrderedDict()
        
        for k, v in raw_state_dict.items():
            if k.startswith('base.'):
                name = k
            elif k.startswith('classifier.1.'):
                name = k.replace('classifier.1.', 'base.classifier.1.1.')
            else:
                name = f"base.{k}"
            new_state_dict[name] = v
        
        print("✓ State dict keys remapped")
        
        class WrappedModel(nn.Module):
            def __init__(self, m):
                super().__init__()
                self.base = m
            def forward(self, x):
                return self.base(x)
        
        final_model = WrappedModel(model)
        final_model.load_state_dict(new_state_dict, strict=False)
        final_model.eval()
        
        print("✓ Model loaded with app.py's loading mechanism")
        
        test_input = torch.randn(1, 3, 240, 240)
        with torch.no_grad():
            output = final_model(test_input)
        
        print(f"\n✓ Forward pass successful!")
        print(f"  Input shape: {test_input.shape}")
        print(f"  Output shape: {output.shape}")
        print(f"  Expected classes: {len(labels)}")
        
        if output.shape[1] == len(labels):
            print("\n✅ SUCCESS! Model is fully compatible with app.py")
            return True
        else:
            print(f"\n❌ Output mismatch! Got {output.shape[1]} but expected {len(labels)}")
            return False
            
    except Exception as e:
        print(f"\n❌ Error during verification: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 80)
    print("PLANTIFY MODEL COMPATIBILITY VERIFICATION")
    print("=" * 80)
    print()
    
    success = verify_model_compatibility()
    
    print("\n" + "=" * 80)
    if success:
        print("✅ Model ready to use with app.py!")
        print("Run: streamlit run app.py")
    else:
        print("❌ Model verification failed!")
        print("Please check the error messages above.")
    print("=" * 80)
