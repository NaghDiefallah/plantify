import streamlit as st
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import pandas as pd
import datetime
import plotly.express as px
import os
import logging
from collections import OrderedDict

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='plantify_system.log',
    filemode='a'
)

st.set_page_config(
    page_title="Plantify AI | Enterprise Vision",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
    :root {
        --primary: #1B4332;
        --secondary: #2D6A4F;
        --accent: #74C69D;
        --background: #F8FAF8;
        --text: #081C15;
    }
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
        background-color: var(--background);
        color: var(--text);
    }
    .main-header {
        background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        padding: 2.5rem;
        border-radius: 20px;
        color: white;
        margin-bottom: 2rem;
        text-align: center;
        box-shadow: 0 10px 30px rgba(27,67,50,0.15);
    }
    .glass-card {
        background: white;
        padding: 1.8rem;
        border-radius: 16px;
        border: 1px solid rgba(0,0,0,0.05);
        box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        margin-bottom: 1.2rem;
    }
    .stButton>button {
        width: 100%;
        border-radius: 10px;
        height: 3.2em;
        background-color: var(--secondary);
        color: white;
        font-weight: 600;
        border: none;
        transition: transform 0.2s ease;
    }
    .stButton>button:hover {
        background-color: var(--primary);
        transform: translateY(-1px);
    }
    </style>
""", unsafe_allow_html=True)

class NeuralOrchestrator:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(self.base_dir, 'plantify_model.pth')
        self.report_path = os.path.join(self.base_dir, 'system_audit_master.csv')
        self.remedies = {
            "blight": {"protocol": "Systemic Fungicide", "active": "Azoxystrobin", "urgency": "High"},
            "rust": {"protocol": "Protective Shield", "active": "Micronized Sulfur", "urgency": "Medium"},
            "spot": {"protocol": "Copper Treatment", "active": "Copper Oxychloride", "urgency": "High"},
            "mildew": {"protocol": "Alkaline Spray", "active": "Potassium Bicarbonate", "urgency": "Low"},
            "virus": {"protocol": "Total Isolation", "active": "Immediate Extraction", "urgency": "Critical"},
            "mite": {"protocol": "Acaricide", "active": "Abamectin", "urgency": "High"}
        }

    @st.cache_resource
    def load_engine(_self):
        if not os.path.exists(_self.model_path):
            logging.error(f"IO_ERROR: Weights missing at {_self.model_path}")
            return None, None
        
        try:
            checkpoint = torch.load(_self.model_path, map_location=_self.device, weights_only=False)
            labels = checkpoint['classes']
            
            model = models.efficientnet_b1(weights=None)
            in_features = model.classifier[1].in_features
            model.classifier[1] = nn.Sequential(
                nn.Dropout(p=0.2, inplace=True),
                nn.Linear(in_features, len(labels))
            )

            state_dict = checkpoint['model_state_dict']
            new_state_dict = OrderedDict()
            
            for k, v in state_dict.items():
                if k.startswith('classifier.1.'):
                    name = k.replace('classifier.1.', 'base.classifier.1.1.')
                else:
                    name = f"base.{k}" if not k.startswith('base.') else k
                new_state_dict[name] = v

            # Model wrapped in base to match validate.py logic
            class WrappedModel(nn.Module):
                def __init__(self, m):
                    super().__init__()
                    self.base = m
                def forward(self, x):
                    return self.base(x)

            final_model = WrappedModel(model)
            final_model.load_state_dict(new_state_dict, strict=True)
            final_model.to(_self.device).eval()
            
            logging.info("STRATEGIC_LOAD: Engine synchronized with validated architecture.")
            return final_model, labels
        except Exception as e:
            logging.critical(f"KERNEL_PANIC: {str(e)}")
            st.error(f"Critical Core Failure: {e}")
            return None, None

    def preprocess(self, img):
        pipeline = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(240),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        return pipeline(img).unsqueeze(0).to(self.device)

orchestrator = NeuralOrchestrator()
engine, class_names = orchestrator.load_engine()

if 'history' not in st.session_state:
    st.session_state.history = []

with st.sidebar:
    st.title("Plantify Core")
    status = "ONLINE" if engine else "OFFLINE"
    st.markdown(f"**Kernel Status:** `{status}`")
    st.markdown(f"**Compute:** `{orchestrator.device.type.upper()}`")
    
    st.divider()
    if st.button("Export Session"):
        if st.session_state.history:
            df = pd.DataFrame(st.session_state.history)
            st.download_button("Download CSV", df.to_csv(index=False), "diagnostics.csv")
    
    if st.button("Clear Buffer"):
        st.session_state.history = []
        st.rerun()

st.markdown('<div class="main-header"><h1>Plantify AI</h1><p>Neural Pathogen Identification System</p></div>', unsafe_allow_html=True)

tabs = st.tabs(["Terminal", "Archive", "Audit"])

with tabs[0]:
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.subheader("Specimen Acquisition")
        mode = st.radio("Input Source", ["Static Image", "Hardware Sensor"], horizontal=True)
        img_input = st.camera_input("Sensor Feed") if mode == "Hardware Sensor" else st.file_uploader("Upload Data", type=["jpg", "png"])
        
        if img_input:
            img = Image.open(img_input).convert('RGB')
            st.image(img, use_container_width=True)
            run_scan = st.button("Execute Diagnostic Sweep")
        st.markdown('</div>', unsafe_allow_html=True)

    with col2:
        if img_input and run_scan and engine:
            with st.spinner("Processing high-order feature maps..."):
                tensor = orchestrator.preprocess(img)
                with torch.inference_mode():
                    outputs = engine(tensor)
                    probs = torch.nn.functional.softmax(outputs, dim=1)[0]
                    conf, idx = torch.max(probs, 0)
                
                res_label = class_names[idx]
                display_name = res_label.split('___')[-1].replace('_', ' ').title()
                score = conf.item()
                
                st.session_state.history.append({
                    "Time": datetime.datetime.now().strftime("%H:%M:%S"),
                    "Diagnosis": display_name,
                    "Confidence": f"{score*100:.1f}%"
                })

                st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                st.metric("Detection Confidence", f"{score*100:.2f}%")
                st.title(display_name)
                
                top_v, top_i = torch.topk(probs, 5)
                fig_data = pd.DataFrame({
                    "Probability": top_v.cpu().numpy(),
                    "Class": [class_names[i].split('___')[-1].replace('_',' ').title() for i in top_i.cpu().numpy()]
                })
                st.plotly_chart(px.bar(fig_data, x="Probability", y="Class", orientation='h', color_discrete_sequence=['#2D6A4F']), use_container_width=True)
                st.markdown('</div>', unsafe_allow_html=True)

                st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                if "healthy" in res_label.lower():
                    st.success("No pathogen detected. Specimen within normal range.")
                else:
                    rmd = next((v for k, v in orchestrator.remedies.items() if k in res_label.lower()), {"protocol": "Specialist Review Required", "active": "N/A", "urgency": "Medium"})
                    st.warning(f"Protocol: {rmd['protocol']}")
                    st.write(f"Active Agent: {rmd['active']}")
                    st.write(f"Urgency: {rmd['urgency']}")
                st.markdown('</div>', unsafe_allow_html=True)



with tabs[1]:
    if st.session_state.history:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.table(pd.DataFrame(st.session_state.history))
        st.markdown('</div>', unsafe_allow_html=True)
    else:
        st.info("No session data available.")

with tabs[2]:
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    if os.path.exists(orchestrator.report_path):
        audit_df = pd.read_csv(orchestrator.report_path)
        st.subheader("System Performance Audit")
        st.dataframe(audit_df, use_container_width=True)
        
        fig_audit = px.line(audit_df, x="Domain", y="Accuracy", markers=True, title="Domain Accuracy Variance")
        st.plotly_chart(fig_audit, use_container_width=True)
    else:
        st.warning("Audit master file not detected. Run validate.py to generate metrics.")
    st.markdown('</div>', unsafe_allow_html=True)



if __name__ == '__main__':
    pass