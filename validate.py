import torch
import torch.nn as nn
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, confusion_matrix
import pandas as pd

def validate():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # 1. LOAD TRAINED DATA
    checkpoint = torch.load('plantify_model.pth')
    class_names = checkpoint['classes']
    
    model = models.mobilenet_v3_large()
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(class_names))
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()

    # 2. PREPARE TEST DATA
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    # Use your 'color' folder for validation
    full_dataset = datasets.ImageFolder(r'D:\Projects\plantify\dataset\color', transform=transform)
    # We take a small random sample (500 images) to speed up report generation
    _, val_subset = torch.utils.data.random_split(full_dataset, [len(full_dataset)-500, 500])
    val_loader = DataLoader(val_subset, batch_size=32, shuffle=False)

    all_preds = []
    all_labels = []

    print("📊 Generating Performance Metrics...")
    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

    # 3. CREATE THE TABLE FOR YOUR REPORT
    report = classification_report(all_labels, all_preds, target_names=class_names, output_dict=True)
    df = pd.DataFrame(report).transpose()
    
    print("\n--- PERFORMANCE SUMMARY TABLE ---")
    print(df.head(10)) # Shows first 10 classes
    df.to_csv('model_performance_report.csv')
    print("\n✅ Report saved as 'model_performance_report.csv'.")

if __name__ == '__main__':
    validate()