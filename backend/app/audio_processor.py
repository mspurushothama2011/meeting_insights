import io
import os
from pydub import AudioSegment

class AudioProcessor:
    """Minimal audio helper: validate, convert to WAV (16k mono), and extract duration."""

    SUPPORTED_EXT = {"wav", "mp3", "m4a", "ogg", "webm", "mp4", "avi", "mov", "mkv", "flv", "wmv", "m4v"}

    def validate_audio_file(self, filename: str) -> bool:
        ext = (filename or "").lower().rsplit('.', 1)[-1]
        return ext in self.SUPPORTED_EXT

    def convert_to_wav(self, input_bytes: bytes, target_path: str) -> str:
        """Convert input audio bytes to 16kHz mono WAV saved at target_path. Returns path."""
        audio = AudioSegment.from_file(io.BytesIO(input_bytes))
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        # Ensure parent dir exists
        os.makedirs(os.path.dirname(target_path) or '.', exist_ok=True)
        audio.export(target_path, format='wav')
        return target_path

    def convert_to_wav_bytes(self, input_bytes: bytes) -> bytes:
        """Convert input audio/video bytes to 16kHz mono WAV and return bytes (no filesystem)."""
        audio = AudioSegment.from_file(io.BytesIO(input_bytes))
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        buf = io.BytesIO()
        audio.export(buf, format='wav')
        return buf.getvalue()

    def extract_duration_seconds(self, input_bytes: bytes) -> float:
        audio = AudioSegment.from_file(io.BytesIO(input_bytes))
        return len(audio) / 1000.0 