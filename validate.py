import torch
import torch.nn as nn
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader, Subset
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import time
import numpy as np
import os
import logging
from collections import OrderedDict

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class ModelEngine(nn.Module):
    def __init__(self, num_classes):
        super(ModelEngine, self).__init__()
        self.base = models.efficientnet_b1(weights=None)
        in_features = self.base.classifier[1].in_features
        self.base.classifier[1] = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(in_features, num_classes)
        )

    def forward(self, x):
        return self.base(x)

def validate_engine():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model_path = 'plantify_model.pth'
    
    if not os.path.exists(model_path):
        logging.error(f"IO_ERROR: Weights file {model_path} not found.")
        return

    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    class_names = checkpoint['classes']
    num_classes = len(class_names)
    
    model = ModelEngine(num_classes)
    state_dict = checkpoint['model_state_dict']
    new_state_dict = OrderedDict()
    
    for k, v in state_dict.items():
        if k.startswith('classifier.1.'):
            name = k.replace('classifier.1.', 'base.classifier.1.1.')
        else:
            name = f"base.{k}" if not k.startswith('base.') else k
        new_state_dict[name] = v

    try:
        model.load_state_dict(new_state_dict, strict=True)
        logging.info("STRATEGIC_LOAD: State dictionary synchronized via recursive mapping.")
    except RuntimeError as e:
        logging.warning("MAPPING_MISMATCH: Falling back to non-strict initialization.")
        model.load_state_dict(new_state_dict, strict=False)
        
    model.to(device).eval()

    test_transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(240),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    

    dataset_root = r'D:\Projects\plantify\dataset'
    domains = ['color', 'grayscale', 'segmented']
    results_summary = []

    for domain in domains:
        path = os.path.join(dataset_root, domain)
        if not os.path.exists(path):
            logging.warning(f"DOMAIN_UNREACHABLE: {path}")
            continue
            
        dataset = datasets.ImageFolder(path, transform=test_transform)
        sample_size = min(1000, len(dataset))
        indices = np.random.choice(len(dataset), sample_size, replace=False)
        
        is_cuda = device.type == 'cuda'
        val_loader = DataLoader(
            Subset(dataset, indices), 
            batch_size=32, 
            shuffle=False, 
            num_workers=4, 
            pin_memory=is_cuda
        )

        y_true, y_pred = [], []
        latencies = []

        logging.info(f"BENCHMARK_INIT: Domain [{domain.upper()}] | Samples: {sample_size}")
        
        with torch.inference_mode():
            for images, labels in val_loader:
                images = images.to(device, non_blocking=True)
                
                start = time.perf_counter()
                outputs = model(images)
                if is_cuda:
                    torch.cuda.synchronize()
                end = time.perf_counter()
                
                latencies.append((end - start) / images.size(0))
                
                preds = torch.argmax(outputs, dim=1)
                y_true.extend(labels.numpy())
                y_pred.extend(preds.cpu().numpy())

        acc = accuracy_score(y_true, y_pred)
        f1 = f1_score(y_true, y_pred, average='macro')
        avg_ms = np.mean(latencies) * 1000
        throughput = 1 / np.mean(latencies)
        
        results_summary.append({
            'Domain': domain,
            'Accuracy': acc,
            'Macro_F1': f1,
            'Latency_ms': avg_ms,
            'FPS': throughput
        })

        pd.DataFrame(classification_report(y_true, y_pred, target_names=class_names, output_dict=True)).transpose().to_csv(f'report_{domain}.csv')
        
        

        plt.figure(figsize=(20, 15))
        sns.heatmap(confusion_matrix(y_true, y_pred), annot=False, cmap='magma', xticklabels=class_names, yticklabels=class_names)
        plt.title(f'NEURAL AUDIT: {domain.upper()} DATASET')
        plt.xlabel('PREDICTED')
        plt.ylabel('ACTUAL')
        plt.savefig(f'audit_viz_{domain}.png', dpi=300, bbox_inches='tight')
        plt.close()

    master_report = pd.DataFrame(results_summary)
    print("\n" + "="*80)
    print("NEURAL ENGINE PERFORMANCE SUMMARY")
    print("-" * 80)
    print(master_report.to_string(index=False))
    print("="*80 + "\n")
    master_report.to_csv('system_audit_master.csv', index=False)

if __name__ == '__main__':
    validate_engine()