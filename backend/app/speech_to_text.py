import os
import time
from typing import Dict, List
import google.generativeai as genai

class SpeechToText:
    """ASR wrapper: uses Gemini API (Cloud) to avoid high memory usage on Render Free Tier.
    
    Falls back to simple local mock if API key is missing.
    """

    def __init__(self, model_name: str = "gemini-1.5-flash", vosk_model_path: str = None, cache_dir: str = None):
        self.model_name = model_name
        self.api_key = os.getenv('GEMINI_API_KEY')
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.backend = 'gemini'
        else:
            self.backend = 'mock'
            print("⚠️ GEMINI_API_KEY not found. Using MOCK transcription.")

    def _ensure_model(self):
        # No local model loading needed for API
        pass

    def transcribe(self, wav_path: str) -> Dict:
        if self.backend == 'gemini':
            return self._transcribe_gemini(wav_path)
        else:
            return self._transcribe_mock(wav_path)

    def _transcribe_gemini(self, wav_path: str) -> Dict:
        """Uploads audio to Gemini and requests transcription."""
        try:
            # 1. Upload the file
            print(f"Uploading {wav_path} to Gemini...")
            audio_file = genai.upload_file(wav_path)
            
            # 2. Wait for processing
            while audio_file.state.name == "PROCESSING":
                print("Processing audio...")
                time.sleep(1)
                audio_file = genai.get_file(audio_file.name)

            if audio_file.state.name == "FAILED":
                raise ValueError("Audio processing failed on Gemini side.")

            # 3. Generate content (Transcribe)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content([
                "Transcribe this audio file exactly as spoken. Do not add any commentary. Output only the text.",
                audio_file
            ])
            
            text = response.text.strip()
            
            # 4. Cleanup (optional, but good practice)
            # genai.delete_file(audio_file.name) 
            
            return {
                'text': text,
                'segments': [] # Gemini 1.5 Flash doesn't return timestamps easily in this mode
            }

        except Exception as e:
            print(f"Gemini Transcription Error: {e}")
            return {
                'text': f"Error during transcription: {str(e)}",
                'segments': []
            }

    def _transcribe_mock(self, wav_path: str) -> Dict:
        """Mock transcription for testing without API keys."""
        return {
            'text': "This is a mock transcription because GEMINI_API_KEY was not found. Please set the environment variable.",
            'segments': []
        }
 
