import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from app.config import config
from faster_whisper import WhisperModel

def download_model():
    print(f"📥 Downloading Whisper model '{config.WHISPER_MODEL}'...")
    print(f"📂 Cache directory: {config.HF_HOME}")
    
    try:
        # This triggers the download
        model_path = os.path.join(config.HF_HOME, 'hub')
        model = WhisperModel(config.WHISPER_MODEL, device="cpu", compute_type="int8", download_root=model_path)
        print("✅ Model downloaded successfully!")
    except Exception as e:
        print(f"❌ Failed to download model: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    download_model()
