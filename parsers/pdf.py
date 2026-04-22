import io
import re
import logging
import pdfplumber
from pypdf import PdfReader
from parsers.ai import detect_category

logger = logging.getLogger(__name__)


def to_float(v):
    if v is None:
        return 0.0
    s = str(v).strip().replace(" ", "").replace("\xa0", "")
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    s = re.sub(r"[^\d.]", "", s)
    try:
        return float(s)
    except (ValueError, TypeError):
        return 0.0


def clean_name(name):
    if not name:
        return ""
    return " ".join(str(name).split())


def extract_article_from_name(name):
    m = re.search(r'\(\s*[Aa]rt\.?\s*(\w+)\s*\)', name)
    return m.group(1) if m else ""


def detect_columns(header_row):
    col_map = {"num_idx": None, "art_idx": None, "name_idx": None,
               "qty_idx": None, "price_idx": None, "price2_idx": None,
               "sum_idx": None}
    for i, cell in enumerate(header_row):
        if cell is None:
            continue
        c = str(cell).lower().replace("\n", " ").strip()
        if re.search(r'^№$|^#$', c):
            col_map["num_idx"] = i
        elif re.search(r'артикул', c):
            col_map["art_idx"] = i
        elif re.search(r'товар|наименован|услуг', c):
            col_map["name_idx"] = i
        elif re.search(r'кол.?во|количество', c):
            col_map["qty_idx"] = i
        elif re.search(r'цена\s+со\s+скидкой|цена со', c):
            col_map["price_idx"] = i
        elif re.search(r'цена\s+без\s+скидки|цена без', c):
            col_map["price2_idx"] = i
        elif re.search(r'^цена$', c):
            col_map["price_idx"] = i
        elif re.search(r'сумма\s+со\s+скидкой|^сумма$', c) and col_map["sum_idx"] is None:
            col_map["sum_idx"] = i
        elif re.search(r'сумма', c) and col_map["sum_idx"] is None:
            col_map["sum_idx"] = i
    if col_map["price_idx"] is None and col_map["price2_idx"] is not None:
        col_map["price_idx"] = col_map["price2_idx"]
    return col_map


def parse_product_row(row, col_map):
    name_idx = col_map["name_idx"]
    if name_idx is None or name_idx >= len(row):
        return None
    num_idx = col_map["num_idx"]
    if num_idx is not None and num_idx < len(row):
        if not re.match(r'^\d+$', str(row[num_idx] or "").strip()):
            return None
    name = clean_name(row[name_idx])
    if not name or len(name) < 3:
        return None
    art_idx = col_map["art_idx"]
    article = str(row[art_idx]).strip() if (art_idx is not None and art_idx < len(row) and row[art_idx]) else extract_article_from_name(name)
    qty_idx = col_map["qty_idx"]
    qty = int(to_float(row[qty_idx])) or 1 if (qty_idx is not None and qty_idx < len(row)) else 1
    unit = "шт"
    for cell in row:
        if cell and str(cell).strip().lower() in ("шт","кг","л","м","уп","пара","компл"):
            unit = str(cell).strip().lower()
            break
    price = to_float(row[col_map["price_idx"]]) if col_map["price_idx"] is not None and col_map["price_idx"] < len(row) else 0.0
    summa = to_float(row[col_map["sum_idx"]]) if col_map["sum_idx"] is not None and col_map["sum_idx"] < len(row) else 0.0
    if summa == 0 and price > 0 and qty > 0:
        summa = round(price * qty, 2)
    return {"название": name, "артикул": article, "количество": qty,
            "единица": unit, "цена": price, "сумма": summa,
            "категория": detect_category(name)}


def normalize_pdf(file_bytes):
    """Поворачивает страницы PDF в портретную ориентацию.

    Проверяет атрибут /Rotate и физические размеры страницы.
    Для горизонтальных страниц применяет поворот 270° (по часовой стрелке).
    """
    from pypdf import PdfWriter
    reader = PdfReader(io.BytesIO(file_bytes))
    writer = PdfWriter()
    changed = False
    for page in reader.pages:
        existing_rotation = page.rotation  # текущий поворот из метаданных PDF
        w = float(page.mediabox.width)
        h = float(page.mediabox.height)
        # После применения существующего поворота определяем реальную ориентацию
        if existing_rotation in (90, 270):
            w, h = h, w  # поменять местами при 90/270°
        if w > h:
            # Страница горизонтальная — поворачиваем 270° (по часовой = стандарт для сканов)
            page.rotate(270)
            changed = True
        writer.add_page(page)
    if not changed:
        return file_bytes  # файл уже в порядке, возвращаем оригинал
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def parse_with_pdfplumber(file_bytes):
    """Парсинг цифрового PDF без ИИ. Возвращает (items, supplier, date, number)."""
    items, supplier, date_str, number = [], "", "", ""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        m = re.search(r'Поставщик[:\s]+(.+?)(?=Покупатель|Договор|$)', text, re.S | re.I)
        if m:
            supplier = clean_name(m.group(1).split("\n")[0])
        m = re.search(r'Счет[^\n]*?№\s*([\w-]+)\s+от\s+(\d+\s+\w+\s+\d{4})', text, re.I)
        if m:
            number, date_str = m.group(1).strip(), m.group(2).strip()
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                for table in page.extract_tables():
                    if not table or len(table) < 2:
                        continue
                    header_text = " ".join(str(c) for c in table[0] if c).lower()
                    if not any(kw in header_text for kw in ["товар","наименован","кол-во","количество","цена"]):
                        continue
                    col_map = detect_columns(table[0])
                    if col_map.get("name_idx") is None:
                        continue
                    for row in table[1:]:
                        item = parse_product_row(row, col_map)
                        if item:
                            items.append(item)
    except Exception as e:
        logger.warning("pdfplumber не смог разобрать файл: %s", e)
    return items, supplier, date_str, number
