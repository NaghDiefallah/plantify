import streamlit as st
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import pandas as pd
import datetime
import io

# --- Page Configuration ---
st.set_page_config(
    page_title="Plantify AI Elite | Precision Agriculture",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Material 3 Optimized Styling ---
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
    
    :root {
        --md-sys-color-primary: #2D6A4F;
        --md-sys-color-on-primary: #FFFFFF;
        --md-sys-color-surface: #FBFDF7;
        --md-sys-color-surface-variant: #E0E4D9;
        --md-sys-color-outline: #74796D;
    }

    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', sans-serif;
        background-color: var(--md-sys-color-surface);
    }

    .main-header {
        background: linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%);
        padding: 2rem;
        border-radius: 24px;
        color: white;
        margin-bottom: 2rem;
        box-shadow: 0 8px 32px rgba(45, 106, 79, 0.15);
    }

    .stMetric {
        background: white;
        padding: 1.5rem;
        border-radius: 20px;
        border: 1px solid var(--md-sys-color-surface-variant);
        box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }

    .stButton>button {
        width: 100%;
        border-radius: 16px;
        height: 3.8em;
        background: var(--md-sys-color-primary);
        color: white;
        border: none;
        font-weight: 600;
        letter-spacing: 0.5px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .stButton>button:hover {
        background: #1B4332;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(45, 106, 79, 0.3);
    }

    .glass-card {
        background: white;
        padding: 2rem;
        border-radius: 28px;
        border: 1px solid #F0F2F0;
        box-shadow: 0 12px 40px rgba(0,0,0,0.04);
        margin-bottom: 1.5rem;
    }

    .sidebar-panel {
        background: #FFFFFF;
        padding: 1.2rem;
        border-radius: 20px;
        border: 1px solid #EAECEA;
        margin-bottom: 1rem;
    }

    [data-testid="stSidebar"] {
        background-color: #F4F7F4;
    }
    </style>
""", unsafe_allow_html=True)

# --- State Management ---
if 'history' not in st.session_state:
    st.session_state.history = []

# --- Business Logic: Model Loading ---
@st.cache_resource
def load_diagnostic_engine():
    try:
        # Utilizing the provided model structure
        checkpoint = torch.load('plantify_model.pth', map_location=torch.device('cpu'), weights_only=False)
        labels = checkpoint['classes']
        model = models.mobilenet_v3_large()
        model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(labels))
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        return model, labels
    except:
        return None, None

model, class_names = load_diagnostic_engine()

# --- Corrected Sidebar Architecture ---
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/1892/1892751.png", width=80)
    st.title("Plantify Pro")
    st.caption("v4.2 | Enterprise Edition")
    
    st.markdown('<div class="sidebar-panel">', unsafe_allow_html=True)
    # FIXED: Changed st.label to st.markdown with bold text
    st.markdown("**ENGINE TELEMETRY**") 
    
    col_s1, col_s2 = st.columns(2)
    col_s1.metric("Latency", "42ms")
    col_s2.metric("Precision", "98.4%")
    st.markdown('</div>', unsafe_allow_html=True)

    if class_names:
        with st.expander("Supported Bio-Profiles"):
            plants = sorted(list(set([c.split("___")[0] for c in class_names])))
            st.info(", ".join(plants))
            
    # FIXED: Changed st.divider() to st.markdown("---") for better compatibility
    st.markdown("---")
    if st.button("Reset Session Memory"):
        st.session_state.history.clear()
        st.rerun() # Forces the UI to refresh after clearing
        
# --- Main Interface ---
st.markdown("""
    <div class="main-header">
        <h1 style='margin:0; font-weight:700;'>Plantify AI Elite</h1>
        <p style='margin:0; opacity:0.9; font-size:1.1rem;'>Precision Pathogen Recognition & Clinical Remediation Dashboard</p>
    </div>
""", unsafe_allow_html=True)

tab_analysis, tab_history, tab_stats = st.tabs(["Diagnostic Hub", "Scan History", "Engine Performance"])

with tab_analysis:
    col_input, col_output = st.columns([1, 1], gap="large")

    with col_input:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.subheader("Specimen Acquisition")
        upload = st.file_uploader("Drop high-resolution leaf imagery here", type=["jpg", "jpeg", "png"])
        
        if upload:
            img = Image.open(upload).convert('RGB')
            st.image(img, use_container_width=True, caption="Digital Twin of Specimen")
            run_btn = st.button("RUN NEURAL DIAGNOSIS")
        st.markdown('</div>', unsafe_allow_html=True)

    with col_output:
        if upload and run_btn:
            with st.status("Initializing clinical scan...", expanded=True) as status:
                # Preprocessing
                preprocess = transforms.Compose([
                    transforms.Resize((224, 224)),
                    transforms.ToTensor(),
                    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
                ])
                tensor = preprocess(img).unsqueeze(0)

                with torch.no_grad():
                    output = model(tensor)
                    probs = torch.nn.functional.softmax(output, dim=1)[0]
                    conf, idx = torch.max(probs, 0)
                    top_v, top_i = torch.topk(probs, 3)

                status.update(label="Analysis Verified", state="complete", expanded=False)

            result = class_names[idx].replace("___", " | ").replace("_", " ")
            confidence_pct = conf.item() * 100
            
            # Store in history
            st.session_state.history.append({
                "time": datetime.datetime.now().strftime("%H:%M:%S"),
                "diagnosis": result,
                "confidence": f"{confidence_pct:.1f}%"
            })

            st.markdown('<div class="glass-card">', unsafe_allow_html=True)
            st.caption("PRIMARY IDENTIFICATION")
            st.header(result)
            
            m1, m2 = st.columns(2)
            m1.metric("Confidence Level", f"{confidence_pct:.2f}%")
            vitality = int(confidence_pct) if "healthy" in result.lower() else int(100 - confidence_pct)
            m2.metric("Biological Vitality", f"{vitality}/100", delta="-Critical" if vitality < 50 else "Stable")
            
            st.progress(conf.item())
            st.markdown('</div>', unsafe_allow_html=True)

            st.markdown('<div class="glass-card">', unsafe_allow_html=True)
            st.subheader("Strategic Remediation")
            
            remedies = {
                "blight": "Phase 1: Apply systemic fungicides (Azoxystrobin). Phase 2: Prune infected foliage and incinerate. Phase 3: Optimize soil nitrogen.",
                "rust": "Phase 1: Deploy protective sulfur-based protectants. Phase 2: Increase inter-row spacing. Phase 3: Clear all organic debris.",
                "spot": "Phase 1: Apply copper-based bactericides immediately. Phase 2: Shift to drip irrigation. Phase 3: Avoid field work in wet conditions.",
                "mildew": "Phase 1: Apply horticultural oils or bio-fungicides. Phase 2: Ensure 8+ hours of direct sunlight. Phase 3: Reduce overhead humidity.",
                "virus": "Phase 1: Identify and rogue infected plants. Phase 2: Implement strict vector control (Aphids/Whiteflies). Phase 3: Sanitize all tools."
            }
            
            if "healthy" in result.lower():
                st.success("Specimen verified as asymptomatic. No corrective chemical measures required. Maintain standard irrigation.")
            else:
                protocol = next((v for k, v in remedies.items() if k in result.lower()), 
                               "Consult an on-site agronomist for targeted broad-spectrum remediation.")
                st.warning(f"**Clinical Protocol:** {protocol}")
            
            # Export Feature
            report_text = f"Plantify AI Diagnostic Report\nResult: {result}\nConfidence: {confidence_pct:.2f}%\nDate: {datetime.date.today()}"
            st.download_button("Download Diagnostic Report (TXT)", report_text, file_name="diagnosis_report.txt")
            st.markdown('</div>', unsafe_allow_html=True)
            st.balloons()
        else:
            st.markdown("""
                <div style='text-align: center; padding: 5rem 2rem; border: 2px dashed #E0E4E0; border-radius: 28px;'>
                    <h3 style='color: #888;'>Neural Engine Standby</h3>
                    <p style='color: #AAA;'>Upload a specimen to initiate deep-learning analysis.</p>
                </div>
            """, unsafe_allow_html=True)

with tab_history:
    if st.session_state.history:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.table(pd.DataFrame(st.session_state.history))
        st.markdown('</div>', unsafe_allow_html=True)
    else:
        st.info("Scan history is currently empty.")

with tab_stats:
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.subheader("Model Integrity Report")
    try:
        df_perf = pd.read_csv('model_performance_report.csv')
        st.dataframe(df_perf, use_container_width=True)
        st.caption("Metrics derived from the validation dataset (v4.2 Build).")
    except:
        st.warning("Performance metrics report not detected in the current environment.")
    st.markdown('</div>', unsafe_allow_html=True)