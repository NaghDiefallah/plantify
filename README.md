# Plantify AI 🌿

A lightweight plant disease detection project using PyTorch and Streamlit.

## 🔧 Prerequisites

- Python 3.8+ (3.9 recommended)
- pip
- (Optional) CUDA-enabled GPU for faster training/inference

## ⚙️ Setup

1. Create & activate a virtual environment (Windows example):

```powershell
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. (Optional) Verify CUDA access:

```bash
python test_cuda.py
```

## 🧪 Datasets

Place your datasets under the `dataset/` folder. Expected structure:

```
dataset/
  color/
  grayscale/
  segmented/
```

Each subfolder should contain class subfolders (ImageFolder format).

## ▶️ Training

- Fast prototype (MobileNetV3):

```bash
python train_lite.py
```

- Production-quality (EfficientNet-B2):

```bash
python train.py
```

Both scripts save the best checkpoint to `plantify_model.pth` (root).

## ✅ Verify model compatibility

Before running the app (or after training), run the verifier:

```bash
python verify_model.py
```

This script attempts to load the saved checkpoint, handle common state-dict prefixes (e.g., `module.`, `base.`), and runs a forward pass to confirm compatibility with `app.py`.

## 📡 Run the Streamlit app

```bash
streamlit run app.py
```

The app will load `plantify_model.pth`, show system info, allow image uploads, show predictions and a heatmap.

## 🛠 Troubleshooting

- "Model not loaded" in app: ensure `plantify_model.pth` exists in project root and `verify_model.py` passes.
- State-dict prefix/key mismatches: re-train or re-save the checkpoint using `model.state_dict()` (avoid `DataParallel` wrapper).
- If CUDA not available, the code will run on CPU automatically.

> Tip: Use `streamlit run app.py` and click **Reload System** in the sidebar after replacing the model file.

## 📁 Useful files

- `train.py` — full training (EfficientNet-B2)
- `train_lite.py` — quick prototype (MobileNetV3-Large)
- `verify_model.py` — compatibility checker for saved checkpoints
- `test_cuda.py` — checks CUDA availability
- `requirements.txt` — Python dependencies

## 📜 License

This project is licensed under the MIT License, check `LICENSE` file.