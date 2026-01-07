import os
from typing import Dict, List

class SpeechToText:
    """ASR wrapper: prefer faster-whisper, fall back to Vosk if available.

    Usage:
        st = SpeechToText(model_name='small')
        res = st.transcribe('/path/to/file.wav')

    Returns: {'text': str, 'segments': [{'start':..., 'end':..., 'text':...}, ...] }
    """

    def __init__(self, model_name: str = "small", vosk_model_path: str = None, cache_dir: str = None):
        self.model_name = model_name
        self.model = None
        self.backend = None  # 'faster-whisper' or 'vosk'
        self.vosk_model_path = vosk_model_path or os.environ.get('VOSK_MODEL_PATH')
        self.cache_dir = cache_dir

    @classmethod
    def probe_backends(cls) -> Dict:
        """Quick check which ASR backends are available and whether a VOSK model path exists.

        Returns a dict like:
        {
          'faster_whisper': True/False,
          'vosk': { 'installed': True/False, 'model_path_env': '...', 'model_path_exists': True/False }
        }
        """
        result = {
            'faster_whisper': False,
            'vosk': {
                'installed': False,
                'model_path_env': os.environ.get('VOSK_MODEL_PATH'),
                'model_path_exists': False,
            }
        }
        try:
            import importlib
            spec = importlib.util.find_spec('faster_whisper')
            result['faster_whisper'] = spec is not None
        except Exception:
            result['faster_whisper'] = False
        try:
            import importlib
            spec = importlib.util.find_spec('vosk')
            result['vosk']['installed'] = spec is not None
        except Exception:
            result['vosk']['installed'] = False
        env = result['vosk']['model_path_env']
        if env and os.path.isdir(env):
            result['vosk']['model_path_exists'] = True
        return result

    def set_vosk_model_path(self, path: str):
        self.vosk_model_path = path

    def _load_faster_whisper(self):
        try:
            from faster_whisper import WhisperModel
            self.model = WhisperModel(self.model_name, device="cpu", cache_dir=self.cache_dir)
            self.backend = 'faster-whisper'
            return True
        except Exception:
            return False

    def _load_vosk(self):
        try:
            from vosk import Model
            # Expect a local model directory; do not auto-download here.
            if not self.vosk_model_path or not os.path.isdir(self.vosk_model_path):
                return False
            self.model = Model(self.vosk_model_path)
            self.backend = 'vosk'
            return True
        except Exception:
            return False

    def _ensure_model(self):
        if self.model is not None:
            return
        if self._load_faster_whisper():
            return
        if self._load_vosk():
            return
        raise RuntimeError(
            "No ASR backend available. Install 'faster-whisper' or provide a Vosk model and install 'vosk'.\n"
            "For Vosk, set environment variable VOSK_MODEL_PATH to the model directory."
        )

    def transcribe(self, wav_path: str) -> Dict:
        self._ensure_model()
        if self.backend == 'faster-whisper':
            return self._transcribe_faster_whisper(wav_path)
        elif self.backend == 'vosk':
            return self._transcribe_vosk(wav_path)
        else:
            raise RuntimeError('Unsupported ASR backend')

    def _transcribe_faster_whisper(self, wav_path: str) -> Dict:
        segments: List[Dict] = []
        full_text_parts: List[str] = []
        # faster-whisper streaming inference
        for segment in self.model.transcribe(wav_path, beam_size=5):
            segments.append({
                'start': float(segment.start),
                'end': float(segment.end),
                'text': segment.text,
            })
            full_text_parts.append(segment.text)
        return {
            'text': "\n".join(full_text_parts).strip(),
            'segments': segments,
        }

    def _transcribe_vosk(self, wav_path: str) -> Dict:
        import wave
        import json
        from vosk import KaldiRecognizer

        segments: List[Dict] = []
        full_text_parts: List[str] = []
        # Ensure the wave file handle is closed to avoid Windows locking issues
        with wave.open(wav_path, "rb") as wf:
            # Vosk expects mono 16-bit WAV; audio_processor should ensure this
            rec = KaldiRecognizer(self.model, wf.getframerate())
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if rec.AcceptWaveform(data):
                    res = json.loads(rec.Result())
                    text = res.get('text', '').strip()
                    if text:
                        full_text_parts.append(text)
            final = json.loads(rec.FinalResult())
            if final.get('text'):
                full_text_parts.append(final.get('text'))
        return {
            'text': "\n".join(full_text_parts).strip(),
            'segments': segments,
        } 
