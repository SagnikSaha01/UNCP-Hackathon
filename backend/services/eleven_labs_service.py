"""
Eleven Labs API service – outline for text-to-speech / voice API.
"""

# TODO: import Eleven Labs client
# from elevenlabs import ElevenLabs (or equivalent)


def call_eleven_labs(text: str, voice_id: str | None = None, **kwargs) -> bytes:
    """
    Call Eleven Labs API (e.g. text-to-speech).

    Args:
        text: Text to synthesize to speech.
        voice_id: Optional voice ID. Defaults to account default if None.
        **kwargs: Optional format/options.

    Returns:
        Audio bytes (e.g. mp3).
    """
    # TODO: configure API key (e.g. from env)
    # TODO: call TTS endpoint with text and voice_id
    # TODO: return audio bytes
    raise NotImplementedError("Eleven Labs service not yet implemented")
