"""
Light-weight training script using MobileNetV3 for fast prototyping.
Use this for quick iterations and testing. Use train.py for production quality.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, ConcatDataset, WeightedRandomSampler
from torchvision import models, transforms, datasets
import os
import random
import numpy as np
from datetime import datetime, timedelta
import time

def set_reproducibility(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

def get_dataset_weights(dataset):
    targets = []
    for _, target in dataset:
        targets.append(target)
    class_counts = np.bincount(targets)
    class_weights = 1.0 / class_counts
    sample_weights = [class_weights[t] for t in targets]
    return sample_weights

def train_model_lite():
    set_reproducibility(42)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, 'dataset')
    color_dir = os.path.join(dataset_dir, 'color')
    grayscale_dir = os.path.join(dataset_dir, 'grayscale')
    segmented_dir = os.path.join(dataset_dir, 'segmented')
    
    train_transform = transforms.Compose([
        transforms.Resize(224),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.3),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    datasets_list = []
    
    if os.path.exists(color_dir):
        print(f"Loading color dataset from {color_dir}")
        color_dataset = datasets.ImageFolder(color_dir, transform=train_transform)
        datasets_list.append(color_dataset)
        print(f"Color dataset: {len(color_dataset)} images")
    
    if os.path.exists(grayscale_dir):
        print(f"Loading grayscale dataset from {grayscale_dir}")
        grayscale_dataset = datasets.ImageFolder(grayscale_dir, transform=train_transform)
        datasets_list.append(grayscale_dataset)
        print(f"Grayscale dataset: {len(grayscale_dataset)} images")
    
    if os.path.exists(segmented_dir):
        print(f"Loading segmented dataset from {segmented_dir}")
        segmented_dataset = datasets.ImageFolder(segmented_dir, transform=train_transform)
        datasets_list.append(segmented_dataset)
        print(f"Segmented dataset: {len(segmented_dataset)} images")
    
    if not datasets_list:
        print("Error: No datasets found!")
        return
    
    combined_dataset = ConcatDataset(datasets_list)
    print(f"\nTotal combined dataset: {len(combined_dataset)} images")
    
    class_names = datasets_list[0].classes
    num_classes = len(class_names)
    print(f"Number of classes: {num_classes}")
    print(f"Classes: {class_names[:5]}..." if len(class_names) > 5 else f"Classes: {class_names}")
    
    sample_weights = get_dataset_weights(combined_dataset)
    sampler = WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(sample_weights),
        replacement=True
    )
    
    train_loader = DataLoader(
        combined_dataset,
        batch_size=32,
        sampler=sampler,
        num_workers=4,
        pin_memory=True if device.type == 'cuda' else False
    )
    
    print(f"\nInitializing MobileNetV3-Large model (lite)...")
    model = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.IMAGENET1K_V1)
    
    # Freeze backbone, only train classifier head
    for param in model.features.parameters():
        param.requires_grad = False
    
    in_features = model.classifier[0].in_features
    model.classifier = nn.Sequential(
        nn.Linear(in_features, 1280),
        nn.Hardswish(inplace=True),
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(1280, num_classes)
    )
    
    model = model.to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-3, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=10, eta_min=1e-6)
    
    scaler = torch.cuda.amp.GradScaler() if device.type == 'cuda' else None
    
    num_epochs = 10
    print(f"\nStarting lite training for {num_epochs} epochs (MobileNetV3)...")
    print("=" * 80)
    
    best_loss = float('inf')
    start_time = time.time()
    
    for epoch in range(num_epochs):
        epoch_start = time.time()
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (inputs, labels) in enumerate(train_loader):
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            
            if scaler:
                with torch.cuda.amp.autocast():
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            else:
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
            
            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            if (batch_idx + 1) % 50 == 0:
                batch_acc = 100. * correct / total
                batch_loss = running_loss / (batch_idx + 1)
                elapsed = time.time() - epoch_start
                batches_done = batch_idx + 1
                batches_total = len(train_loader)
                eta_seconds = (elapsed / batches_done) * (batches_total - batches_done)
                eta = str(timedelta(seconds=int(eta_seconds)))
                
                print(f"Epoch [{epoch+1}/{num_epochs}] Batch [{batch_idx+1}/{len(train_loader)}] "
                      f"Loss: {batch_loss:.4f} Acc: {batch_acc:.2f}% ETA: {eta}")
        
        epoch_loss = running_loss / len(train_loader)
        epoch_acc = 100. * correct / total
        epoch_time = time.time() - epoch_start
        
        scheduler.step()
        current_lr = optimizer.param_groups[0]['lr']
        
        print(f"\nEpoch [{epoch+1}/{num_epochs}] Summary:")
        print(f"  Loss: {epoch_loss:.4f}")
        print(f"  Accuracy: {epoch_acc:.2f}%")
        print(f"  Learning Rate: {current_lr:.6f}")
        print(f"  Time: {timedelta(seconds=int(epoch_time))}")
        print("=" * 80)
        
        if epoch_loss < best_loss:
            best_loss = epoch_loss
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'classes': class_names,
                'arch': 'mobilenet_v3_large',
                'epoch': epoch + 1,
                'loss': epoch_loss,
                'accuracy': epoch_acc,
                'num_classes': num_classes
            }
            
            model_path = os.path.join(base_dir, 'plantify_model.pth')
            torch.save(checkpoint, model_path)
            print(f"✓ Lite model saved to {model_path}\n")
    
    total_time = time.time() - start_time
    print(f"\nLite training completed in {timedelta(seconds=int(total_time))}")
    print(f"Best Loss: {best_loss:.4f}")
    print(f"Model saved to: {os.path.join(base_dir, 'plantify_model.pth')}")

if __name__ == '__main__':
    train_model_lite()
