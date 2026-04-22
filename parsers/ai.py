import json
import base64
import logging
import anthropic

logger = logging.getLogger(__name__)

CLAUDE_PROMPT = """Извлеки все товарные позиции из документа.

Документ может быть повёрнут на 90°, 180° или 270°, или сфотографирован под углом — читай текст в любой ориентации.

Верни ТОЛЬКО JSON, без какого-либо текста до или после. Без markdown. Без пояснений.

Формат ответа:
{"поставщик":"название","дата":"дд.мм.гггг","номер":"номер","позиции":[{"название":"наименование","артикул":"артикул или штрихкод или пустая строка","количество":1,"единица":"шт","цена":0.0,"сумма":0.0,"категория":"Электрика"}]}

Категории: Сантехника, Электрика, Инструменты, Отделка, Крепёж, Стройматериалы, Другое.
Числа — только цифры без пробелов и символов валюты. Если поле не читается — пустая строка или 0."""


def detect_category(name):
    n = name.lower()
    if any(w in n for w in ["кран","клапан","вантуз","заглушка","труба","фитинг","муфта","смеситель"]):
        return "Сантехника"
    if any(w in n for w in ["лампа","кабель","провод","розетка","выключатель","светильник","led","дюбель хомут"]):
        return "Электрика"
    if any(w in n for w in ["шпатель","кювета","правило","мастерок","валик","кисть"]):
        return "Отделка"
    if any(w in n for w in ["стусло","пила","бур","сверло","молоток","ножовка","дрель","мотыга"]):
        return "Инструменты"
    if any(w in n for w in ["дюбель","саморез","болт","гайка","шуруп","анкер"]):
        return "Крепёж"
    if any(w in n for w in ["цемент","штукатурка","смесь","клей","грунт","пена"]):
        return "Стройматериалы"
    return "Другое"


def recognize_invoice(file_bytes, api_key, is_pdf=False):
    client = anthropic.Anthropic(api_key=api_key)

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
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": [file_part, {"type": "text", "text": CLAUDE_PROMPT}]}],
    )

    raw = response.content[0].text.strip()
    logger.info("Claude raw response (first 500 chars): %s", raw[:500])

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
