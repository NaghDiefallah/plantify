import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader, WeightedRandomSampler, ConcatDataset
from torch.cuda.amp import GradScaler, autocast
import os

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomAffine(degrees=15, translate=(0.1, 0.1), shear=10),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    data_roots = [
        r'D:\Projects\plantify\dataset\color',
        r'D:\Projects\plantify\dataset\grayscale',
        r'D:\Projects\plantify\dataset\segmented'
    ]

    valid_datasets = []
    for root in data_roots:
        if os.path.exists(root):
            valid_datasets.append(datasets.ImageFolder(root, transform=transform))
    
    combined_dataset = ConcatDataset(valid_datasets)
    class_names = valid_datasets[0].classes
    total_classes = len(class_names)

    all_targets = []
    for dset in valid_datasets:
        all_targets.extend(dset.targets)
    targets = torch.tensor(all_targets)
    
    counts = torch.bincount(targets)
    weights = 1. / counts.float()
    sample_weights = weights[targets]
    
    loader = DataLoader(
        combined_dataset, 
        batch_size=32, 
        sampler=WeightedRandomSampler(sample_weights, len(sample_weights)),
        num_workers=4, 
        pin_memory=True,
        prefetch_factor=2
    )

    model = models.efficientnet_b1(weights=models.EfficientNet_B1_Weights.DEFAULT)
    model.classifier[1] = nn.Sequential(
        nn.Dropout(p=0.45, inplace=True),
        nn.Linear(model.classifier[1].in_features, total_classes)
    )
    model = model.to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.05)
    
    epochs = 10
    scheduler = optim.lr_scheduler.OneCycleLR(
        optimizer, 
        max_lr=2e-3, 
        steps_per_epoch=len(loader), 
        epochs=epochs,
        pct_start=0.3,
        div_factor=25.0,
        final_div_factor=1000.0
    )

    scaler = torch.amp.GradScaler('cuda', enabled=(device.type == 'cuda'))

    print(f"System: {device}")
    print(f"Domains: {len(valid_datasets)}")
    print(f"Total Samples: {len(combined_dataset)}")

    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        
        for images, labels in loader:
            images, labels = images.to(device, non_blocking=True), labels.to(device, non_blocking=True)
            
            optimizer.zero_grad(set_to_none=True)
            
            with torch.amp.autocast('cuda', enabled=(device.type == 'cuda')):
                logits = model(images)
                loss = criterion(logits, labels)
            
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            scheduler.step()
            
            running_loss += loss.item()
        
        avg_loss = running_loss / len(loader)
        lr = scheduler.get_last_lr()[0]
        print(f"Epoch {epoch+1:02d} | Loss: {avg_loss:.5f} | LR: {lr:.6f}")

    torch.save({
        'model_state_dict': model.state_dict(),
        'classes': class_names,
        'arch': 'efficientnet_b1_multi_domain',
        'input_size': 224
    }, 'plantify_model.pth')

if __name__ == '__main__':
    main()