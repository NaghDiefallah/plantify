import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🚀 Training on: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")

    data_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    data_dir = r'D:\Projects\plantify\dataset\color' 
    train_dataset = datasets.ImageFolder(data_dir, transform=data_transforms)
    
    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True, num_workers=2, pin_memory=True)

    model = models.mobilenet_v3_large(weights='DEFAULT')
    num_classes = len(train_dataset.classes)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, num_classes)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    epochs = 6 
    print(f"Detected {num_classes} categories. Starting training...")

    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()
        
        print(f"Epoch {epoch+1}/{epochs} - Avg Loss: {running_loss/len(train_loader):.4f}")

    torch.save({
        'model_state_dict': model.state_dict(),
        'classes': train_dataset.classes
    }, 'plantify_model.pth')

    print("✅ Training Complete! Saved as plantify_model.pth")

if __name__ == '__main__':
    main()