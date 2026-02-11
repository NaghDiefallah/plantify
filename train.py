import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, ConcatDataset, WeightedRandomSampler, random_split
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

def train_model():
    set_reproducibility(42)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, 'dataset')
    color_dir = os.path.join(dataset_dir, 'color')
    grayscale_dir = os.path.join(dataset_dir, 'grayscale')
    segmented_dir = os.path.join(dataset_dir, 'segmented')
    
    train_transform = transforms.Compose([
        transforms.Resize(256),
        transforms.RandomCrop(240),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.3),
        transforms.RandomRotation(30),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(240),
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
    
    train_size = int(0.8 * len(combined_dataset))
    val_size = len(combined_dataset) - train_size
    train_dataset, val_dataset = random_split(combined_dataset, [train_size, val_size])
    
    val_dataset.dataset = ConcatDataset([
        type('obj', (object,), {'__getitem__': lambda self, idx: train_dataset.dataset[idx][0] if hasattr(train_dataset.dataset[idx][0], 'save') else train_dataset.dataset[idx]})()
    ])
    
    class_names = datasets_list[0].classes
    num_classes = len(class_names)
    print(f"Number of classes: {num_classes}")
    print(f"Classes: {class_names[:5]}..." if len(class_names) > 5 else f"Classes: {class_names}")
    print(f"Train/Val split: {train_size}/{val_size}")
    
    sample_weights = get_dataset_weights(combined_dataset)
    sampler = WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(sample_weights),
        replacement=True
    )
    
    train_loader = DataLoader(
        combined_dataset,
        batch_size=64,
        sampler=sampler,
        num_workers=8,
        pin_memory=True if device.type == 'cuda' else False
    )
    
    print(f"\nInitializing EfficientNet-B2 model (production quality)...")
    model = models.efficientnet_b2(weights=models.EfficientNet_B2_Weights.IMAGENET1K_V1)
    
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes)
    )
    
    model = model.to(device)
    
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=5e-4, weight_decay=0.01)
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=5, T_mult=2, eta_min=1e-6)
    
    scaler = torch.cuda.amp.GradScaler() if device.type == 'cuda' else None
    
    num_epochs = 20
    print(f"\nStarting production training for {num_epochs} epochs...")
    print("=" * 100)
    
    best_val_loss = float('inf')
    patience = 5
    patience_counter = 0
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
        print(f"  Train Loss: {epoch_loss:.4f}")
        print(f"  Train Accuracy: {epoch_acc:.2f}%")
        print(f"  Learning Rate: {current_lr:.6f}")
        print(f"  Time: {timedelta(seconds=int(epoch_time))}")
        print("=" * 100)
        
        if epoch_loss < best_val_loss:
            best_val_loss = epoch_loss
            patience_counter = 0
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'classes': class_names,
                'arch': 'efficientnet_b2',
                'epoch': epoch + 1,
                'loss': epoch_loss,
                'accuracy': epoch_acc,
                'num_classes': num_classes
            }
            
            model_path = os.path.join(base_dir, 'plantify_model.pth')
            torch.save(checkpoint, model_path)
            print(f"✓ Model saved to {model_path}\n")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\nEarly stopping triggered after {patience} epochs without improvement")
                break
    
    total_time = time.time() - start_time
    print(f"\nTraining completed in {timedelta(seconds=int(total_time))}")
    print(f"Best Loss: {best_val_loss:.4f}")
    print(f"Model saved to: {os.path.join(base_dir, 'plantify_model.pth')}")

if __name__ == '__main__':
    train_model()
