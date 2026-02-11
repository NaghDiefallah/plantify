import streamlit as st
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import pandas as pd
import datetime
import plotly.express as px
import plotly.graph_objects as go
import os
import cv2
import numpy as np
from collections import OrderedDict
import time

st.set_page_config(
    page_title="Plantify AI",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="collapsed"
)

def check_system_status():
    return {
        'cuda_available': torch.cuda.is_available(),
        'pytorch_version': torch.__version__,
        'device_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU',
        'device_count': torch.cuda.device_count() if torch.cuda.is_available() else 0,
        'cuda_version': torch.version.cuda if torch.cuda.is_available() else 'N/A'
    }

system_status = check_system_status()

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* { font-family: 'Inter', sans-serif; }

:root {
    --primary: #10b981;
    --primary-dark: #059669;
    --bg-main: #0F172A;
    --bg-card: #1E293B;
    --bg-hover: #334155;
    --text-primary: #F1F5F9;
    --text-secondary: #94A3B8;
    --border: rgba(255, 255, 255, 0.1);
}

.stApp { background: var(--bg-main); }
[data-testid="stHeader"] { background: transparent; }

.hero-title {
    font-size: 3.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align: center;
    margin: 1.5rem 0 0.5rem 0;
    letter-spacing: -0.03em;
}

.hero-subtitle {
    text-align: center;
    color: var(--text-secondary);
    font-size: 1.15rem;
    font-weight: 400;
    margin-bottom: 2.5rem;
}

.card {
    background: var(--bg-card);
    border-radius: 20px;
    padding: 2rem;
    border: 1px solid var(--border);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
    background: var(--bg-hover);
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1.25rem;
    border-radius: 25px;
    font-size: 0.9rem;
    font-weight: 600;
}

.status-online {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1.5px solid rgba(16, 185, 129, 0.4);
}

.status-offline {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1.5px solid rgba(239, 68, 68, 0.4);
}

.stButton>button {
    width: 100%;
    border-radius: 14px;
    height: 3.2rem;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    color: white;
    font-weight: 600;
    font-size: 1rem;
    border: none;
    transition: all 0.3s ease;
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
}

.stButton>button:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.5);
}

[data-testid="stMetricValue"] {
    font-size: 2.2rem;
    font-weight: 700;
    color: var(--primary);
}

[data-testid="stMetricLabel"] {
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

[data-testid="stSidebar"] {
    background: var(--bg-card);
    border-right: 1px solid var(--border);
}

.stTabs [data-baseweb="tab-list"] {
    gap: 0.75rem;
    background: transparent;
    border-bottom: none;
}

.stTabs [data-baseweb="tab"] {
    background: var(--bg-card);
    border-radius: 14px;
    padding: 0.85rem 1.75rem;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    font-weight: 600;
    transition: all 0.3s ease;
}

.stTabs [aria-selected="true"] {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

h1, h2, h3 { color: var(--text-primary); }
p { color: var(--text-secondary); }

.metric-card {
    text-align: center;
    padding: 1.5rem;
    background: var(--bg-card);
    border-radius: 16px;
    border: 1px solid var(--border);
}

.prediction-result {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
    border-radius: 20px;
    padding: 2rem;
    border: 1px solid var(--border);
    margin: 1rem 0;
}
</style>
""", unsafe_allow_html=True)

class NeuralEngine:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(self.base_dir, 'plantify_model.pth')
        self.report_path = os.path.join(self.base_dir, 'system_audit_master.csv')
        self.model_arch = None

    @st.cache_resource
    def load_model(_self):
        if not os.path.exists(_self.model_path):
            return None, None
        try:
            checkpoint = torch.load(_self.model_path, map_location=_self.device, weights_only=False)
            labels = checkpoint['classes']
            arch = checkpoint.get('arch', 'unknown')
            _self.model_arch = arch
            
            # Load based on architecture
            if 'mobilenet' in arch.lower():
                model = models.mobilenet_v3_large(weights=None)
                in_features = model.classifier[0].in_features
                model.classifier = nn.Sequential(
                    nn.Linear(in_features, 1280),
                    nn.Hardswish(inplace=True),
                    nn.Dropout(p=0.2, inplace=True),
                    nn.Linear(1280, len(labels))
                )
            else:  # EfficientNet-B2
                model = models.efficientnet_b2(weights=None)
                in_features = model.classifier[1].in_features
                model.classifier[1] = nn.Sequential(
                    nn.Dropout(p=0.3, inplace=True),
                    nn.Linear(in_features, len(labels))
                )
            
            raw_state_dict = checkpoint.get('model_state_dict', checkpoint)
            model.load_state_dict(raw_state_dict, strict=False)
            model.to(_self.device).eval()
            return model, labels
        except Exception as e:
            st.error(f"Model loading error: {e}")
            return None, None

    def preprocess(self, img):
        pipeline = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(240),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        tensor = pipeline(img).unsqueeze(0).to(self.device)
        
        # Test-time augmentation: use multiple crops and average predictions
        # This helps with accuracy when model was trained with RandomCrop
        crops = [tensor]
        for _ in range(2):
            img_aug = transforms.functional.hflip(img)
            tensor_aug = pipeline(img_aug).unsqueeze(0).to(self.device)
            crops.append(tensor_aug)
        
        return crops if len(crops) > 1 else tensor

    def generate_heatmap(self, model, img_tensor, original_image):
        model.zero_grad()
        
        # Determine target layer based on architecture
        if hasattr(model, 'features'):
            # MobileNetV3 structure
            target_layer = model.features[-1]
        elif hasattr(model, 'base') and hasattr(model.base, 'features'):
            # EfficientNet wrapped structure
            target_layer = model.base.features[-1]
        else:
            # Fallback - return original image
            return np.array(original_image.resize((240, 240)))
        
        activated_features = []
        activated_gradients = []
        
        def hook_feature(module, input, output):
            activated_features.append(output)
        
        def hook_gradient(module, grad_input, grad_output):
            activated_gradients.append(grad_output[0])
        
        forward_handle = target_layer.register_forward_hook(hook_feature)
        backward_handle = target_layer.register_full_backward_hook(hook_gradient)
        
        with torch.enable_grad():
            img_tensor.requires_grad = True
            output = model(img_tensor)
            pred_idx = output.argmax(dim=1).item()
            target = output[0, pred_idx]
            target.backward()
        
        forward_handle.remove()
        backward_handle.remove()
        
        if not activated_gradients or not activated_features:
            return np.array(original_image.resize((240, 240)))
        
        gradients = activated_gradients[0]
        features = activated_features[0]
        
        pooled_gradients = torch.mean(gradients, dim=[0, 2, 3])
        
        for i in range(features.shape[1]):
            features[:, i, :, :] *= pooled_gradients[i]
        
        heatmap = torch.mean(features, dim=1).squeeze()
        heatmap = np.maximum(heatmap.detach().cpu().numpy(), 0)
        heatmap /= (np.max(heatmap) + 1e-8)
        
        img = np.array(original_image.resize((240, 240)))
        heatmap = cv2.resize(heatmap, (240, 240))
        heatmap = np.uint8(255 * heatmap)
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        superimposed_img = cv2.addWeighted(img, 0.6, heatmap, 0.4, 0)
        return superimposed_img

if 'history' not in st.session_state:
    st.session_state.history = []

engine = NeuralEngine()
model, class_names = engine.load_model()

st.markdown('<div class="hero-title">🌿 Plantify AI</div>', unsafe_allow_html=True)
st.markdown('<div class="hero-subtitle">Advanced Plant Disease Detection with Neural Intelligence</div>', unsafe_allow_html=True)

col_status1, col_status2, col_status3 = st.columns(3)
with col_status1:
    status_class = "status-online" if model else "status-offline"
    status_text = "Engine Online" if model else "Engine Offline"
    st.markdown(f'<div class="status-badge {status_class}">⚡ {status_text}</div>', unsafe_allow_html=True)
with col_status2:
    cuda_class = "status-online" if system_status['cuda_available'] else "status-offline"
    cuda_text = f"GPU: {system_status['device_name'][:15]}" if system_status['cuda_available'] else "CPU Mode"
    st.markdown(f'<div class="status-badge {cuda_class}">🖥️ {cuda_text}</div>', unsafe_allow_html=True)
with col_status3:
    st.markdown(f'<div class="status-badge status-online">📦 PyTorch {system_status["pytorch_version"][:6]}</div>', unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

tabs = st.tabs(["🔬 Inference", "📊 History", "⚡ Performance", "ℹ️ System"])

with tabs[0]:
    col1, col2 = st.columns([1, 1.3])
    
    with col1:
        st.markdown('<div class="card">', unsafe_allow_html=True)
        st.subheader("Upload Image")
        uploaded_file = st.file_uploader(
            "Choose a plant leaf image",
            type=["jpg", "jpeg", "png"],
            help="Upload a clear image of a plant leaf for disease detection"
        )
        st.markdown('</div>', unsafe_allow_html=True)
    
    with col2:
        if uploaded_file and model:
            st.markdown('<div class="card">', unsafe_allow_html=True)
            
            img = Image.open(uploaded_file).convert('RGB')
            tensor = engine.preprocess(img)
            
            with st.spinner("Analyzing..."):
                start_time = time.time()
                tensors = engine.preprocess(img)
                
                # Handle both single tensor and list of tensors
                if isinstance(tensors, list):
                    # Average predictions from multiple augmented versions
                    all_outputs = []
                    for tensor in tensors:
                        outputs = model(tensor)
                        all_outputs.append(outputs)
                    outputs = torch.mean(torch.stack(all_outputs), dim=0)
                else:
                    tensor = tensors
                    outputs = model(tensor)
                
                inference_time = (time.time() - start_time) * 1000
                
                probs = torch.nn.functional.softmax(outputs, dim=1)[0]
                conf, idx = torch.max(probs, 0)
                
                label_raw = class_names[idx]
                display_label = label_raw.split('___')[-1].replace('_', ' ').title()
                plant_type = label_raw.split('___')[0].replace('_', ' ').title()
                
                # Use the first tensor for heatmap if multiple
                tensor_for_heatmap = tensors[0] if isinstance(tensors, list) else tensors
                heatmap_img = engine.generate_heatmap(model, tensor_for_heatmap, img)
                
                st.session_state.history.insert(0, {
                    "Time": datetime.datetime.now().strftime("%H:%M:%S"),
                    "Plant": plant_type,
                    "Diagnosis": display_label,
                    "Confidence": f"{conf.item()*100:.1f}%"
                })
            
            st.markdown('<div class="prediction-result">', unsafe_allow_html=True)
            st.markdown(f"### {plant_type}")
            st.markdown(f"#### Diagnosis: **{display_label}**")
            st.markdown('</div>', unsafe_allow_html=True)
            
            m1, m2, m3 = st.columns(3)
            m1.metric("Confidence", f"{conf.item()*100:.2f}%")
            m2.metric("Inference", f"{inference_time:.1f}ms")
            m3.metric("Device", system_status['device_name'][:10])
            
            st.image(heatmap_img, caption="Attention Heatmap", use_container_width=True)
            
            top_v, top_i = torch.topk(probs, 5)
            top_labels = [class_names[i].split('___')[-1].replace('_', ' ').title() for i in top_i]
            
            fig = go.Figure(go.Bar(
                x=top_v.detach().cpu().numpy() * 100,
                y=top_labels,
                orientation='h',
                marker=dict(
                    color=top_v.detach().cpu().numpy(),
                    colorscale='Greens',
                    line=dict(width=0)
                )
            ))
            fig.update_layout(
                title="Top 5 Predictions",
                xaxis_title="Confidence (%)",
                yaxis_title="",
                height=300,
                margin=dict(l=0, r=0, t=40, b=0),
                template="plotly_dark",
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)'
            )
            st.plotly_chart(fig, use_container_width=True)
            st.markdown('</div>', unsafe_allow_html=True)
        
        elif not model:
            st.markdown('<div class="card">', unsafe_allow_html=True)
            st.warning("⚠️ Model not loaded. Please ensure 'plantify_model.pth' exists in the root directory.")
            st.markdown('</div>', unsafe_allow_html=True)

with tabs[1]:
    if st.session_state.history:
        st.markdown('<div class="card">', unsafe_allow_html=True)
        df_history = pd.DataFrame(st.session_state.history)
        st.dataframe(df_history, use_container_width=True, height=400)
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("Clear History", use_container_width=True):
                st.session_state.history = []
                st.rerun()
        with col2:
            csv = df_history.to_csv(index=False)
            st.download_button(
                "Download CSV",
                csv,
                "plantify_history.csv",
                "text/csv",
                use_container_width=True
            )
        st.markdown('</div>', unsafe_allow_html=True)
    else:
        st.info("📝 No inference history yet. Upload an image to get started.")

with tabs[2]:
    if os.path.exists(engine.report_path):
        st.markdown('<div class="card">', unsafe_allow_html=True)
        df = pd.read_csv(engine.report_path)
        
        col1, col2, col3 = st.columns(3)
        col1.metric("Avg Accuracy", f"{df['Accuracy'].mean()*100:.2f}%")
        col2.metric("Avg Latency", f"{df['Latency_ms'].mean():.2f}ms")
        col3.metric("Avg FPS", f"{df['FPS'].mean():.1f}")
        
        st.dataframe(df, use_container_width=True)
        
        fig = px.scatter(
            df, x="Latency_ms", y="Accuracy",
            color="Domain", size="FPS",
            hover_name="Domain",
            title="Performance Matrix"
        )
        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)'
        )
        st.plotly_chart(fig, use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)
    else:
        st.info("📈 No performance data available. Run validation to generate metrics.")

with tabs[3]:
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.subheader("System Information")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Hardware")
        st.write(f"**Device:** {system_status['device_name']}")
        st.write(f"**CUDA Available:** {system_status['cuda_available']}")
        st.write(f"**CUDA Version:** {system_status['cuda_version']}")
        st.write(f"**Device Count:** {system_status['device_count']}")
    
    with col2:
        st.markdown("#### Software")
        st.write(f"**PyTorch Version:** {system_status['pytorch_version']}")
        if model and engine.model_arch:
            arch_display = "EfficientNet-B2" if "efficientnet" in engine.model_arch.lower() else "MobileNetV3-Large"
            st.write(f"**Model Architecture:** {arch_display}")
            st.write(f"**Classes:** {len(class_names)}")
            st.write(f"**Input Size:** 240×240")
        else:
            st.write("**Model Status:** Not loaded")
    
    if model:
        st.markdown("#### Sample Classes")
        cols = st.columns(4)
        for i, cls in enumerate(class_names[:8]):
            with cols[i % 4]:
                st.caption(f"{i+1}. {cls.split('___')[-1].replace('_', ' ')}")
    
    st.markdown('</div>', unsafe_allow_html=True)

with st.sidebar:
    st.markdown("### ⚙️ Controls")
    if st.button("🔄 Reload System", use_container_width=True):
        st.cache_resource.clear()
        st.rerun()
    
    st.markdown("---")
    st.markdown("### 📊 Quick Stats")
    if st.session_state.history:
        st.metric("Total Scans", len(st.session_state.history))
    st.metric("Model Status", "✓ Loaded" if model else "✗ Not Loaded")
    
    st.markdown("---")
    st.caption("Plantify AI")
