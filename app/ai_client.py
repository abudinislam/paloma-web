"""
ai_client.py — распознавание накладных через Claude API.
"""
import base64
import json
import logging
import anthropic

from .config import CLAUDE_API_KEY, CLAUDE_PROMPT
from .parser import detect_category

logger = logging.getLogger(__name__)


def recognize_invoice(file_bytes: bytes, is_pdf: bool = False) -> dict:
    """Отправляет файл в Claude и возвращает распознанные данные как dict."""
    client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

    if is_pdf or file_bytes[:4] == b'%PDF':
        mime_type = "application/pdf"
    elif file_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        mime_type = "image/png"
    elif file_bytes[:2] == b'\xff\xd8':
        mime_type = "image/jpeg"
    else:
        mime_type = "image/jpeg"

    b64 = base64.standard_b64encode(file_bytes).decode("utf-8")

    if mime_type == "application/pdf":
        file_part = {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64}}
    else:
        file_part = {"type": "image", "source": {"type": "base64", "media_type": mime_type, "data": b64}}

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": [file_part, {"type": "text", "text": CLAUDE_PROMPT}]}],
    )

    raw = response.content[0].text.strip()

    if "```" in raw:
        for chunk in raw.split("```"):
            chunk = chunk.strip().lstrip("json").strip()
            if chunk.startswith("{"):
                raw = chunk
                break

    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start >= 0 and end > start:
        raw = raw[start:end]

    data = json.loads(raw)
    for p in data.get("позиции", []):
        if not p.get("категория") or p["категория"] == "Другое":
            p["категория"] = detect_category(p.get("название", ""))
    return data
