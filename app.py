"""
PalomaBot Web — веб-сервис для парсинга накладных
Flask + Claude API → xlsx для Paloma365
"""
import os
from flask import Flask
from extensions import db, limiter

CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "")
if not CLAUDE_API_KEY:
    raise RuntimeError("CLAUDE_API_KEY не задан. Установи переменную окружения перед запуском.")

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///paloma.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
limiter.init_app(app)

CLAUDE_PROMPT = """Извлеки все товарные позиции из документа.

Документ может быть повёрнут или сфотографирован под углом — читай текст в любой ориентации.

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


# ── pdfplumber парсер (бесплатно, для цифровых PDF) ───────────

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

def parse_with_pdfplumber(file_bytes):
    """Парсинг цифрового PDF без ИИ. Возвращает (items, supplier, date, number)."""
    import io
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
        app.logger.warning("pdfplumber не смог разобрать файл: %s", e)
    return items, supplier, date_str, number


def normalize_pdf(file_bytes):
    """Поворачивает горизонтальные страницы PDF на 90° перед отправкой в Claude."""
    import io
    from pypdf import PdfReader, PdfWriter
    reader = PdfReader(io.BytesIO(file_bytes))
    writer = PdfWriter()
    for page in reader.pages:
        w = float(page.mediabox.width)
        h = float(page.mediabox.height)
        if w > h:
            page.rotate(90)
        writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def recognize_invoice(file_bytes, is_pdf=False):
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

    # Ищем JSON любым способом
    # 1. Убираем markdown блоки
    if "```" in raw:
        for chunk in raw.split("```"):
            chunk = chunk.strip().lstrip("json").strip()
            if chunk.startswith("{"):
                raw = chunk
                break

    # 2. Берём только от первой { до последней }
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start >= 0 and end > start:
        raw = raw[start:end]

    data = json.loads(raw)
    for p in data.get("позиции", []):
        if not p.get("категория") or p["категория"] == "Другое":
            p["категория"] = detect_category(p.get("название", ""))
    return data


def make_paloma_xlsx(items, supplier):
    if not TEMPLATE_PATH.exists():
        raise FileNotFoundError("items_template.xlsx не найден на сервере")

    with zipfile.ZipFile(TEMPLATE_PATH) as z:
        parts = {name: z.read(name) for name in z.namelist()}

    sheet_xml = parts['xl/worksheets/sheet1.xml'].decode('utf-8')

    sst = list(PALOMA_HEADERS)
    sst_index = {s: i for i, s in enumerate(sst)}

    def get_idx(s):
        if s not in sst_index:
            sst_index[s] = len(sst)
            sst.append(s)
        return sst_index[s]

    supplier_clean = str(supplier).strip()
    if "," in supplier_clean:
        supplier_clean = supplier_clean.split(",")[0].strip()

    rows_data = []
    for i, item in enumerate(items, 1):
        name  = str(item.get("название", "")).strip()
        art   = str(item.get("артикул", "")).strip()
        qty   = item.get("количество", 1) or 1
        unit  = str(item.get("единица", "шт")).strip()
        price = float(item.get("цена", 0))
        summa = float(item.get("сумма", 0))
        cat   = str(item.get("категория", "Другое")).strip()
        if summa == 0 and price > 0:
            summa = round(price * qty, 2)
        rows_data.append({
            'code_idx': get_idx(f"IMP-{i:04d}"),
            'cat_idx': get_idx(cat),
            'name_idx': get_idx(name),
            'art_idx': get_idx(art) if art else None,
            'unit_idx': get_idx(unit),
            'net_idx': get_idx('Нет'),
            'da_idx': get_idx('Да'),
            'supplier_idx': get_idx(supplier_clean),
            'price': price, 'qty': qty, 'summa': summa,
        })

    sst_parts = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n']
    sst_parts.append(f'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{len(sst)}" uniqueCount="{len(sst)}">')
    for s in sst:
        sst_parts.append(f'<si><t xml:space="preserve">{xml_escape(s)}</t></si>')
    sst_parts.append('</sst>')

    def make_row(n, d):
        c = [
            f'<c r="A{n}" s="13" t="s"><v>{d["code_idx"]}</v></c>',
            f'<c r="B{n}" s="14"/>',
            f'<c r="C{n}" s="15" t="s"><v>{d["cat_idx"]}</v></c>',
            f'<c r="D{n}" s="15" t="s"><v>{d["name_idx"]}</v></c>',
            f'<c r="E{n}" s="16"><v>{d["price"]}</v></c>',
            f'<c r="F{n}" s="17"/>',
            f'<c r="G{n}" s="17" t="s"><v>{d["art_idx"]}</v></c>' if d["art_idx"] is not None else f'<c r="G{n}" s="17"/>',
            f'<c r="H{n}" s="14"/>',
            f'<c r="I{n}" s="18" t="s"><v>{d["unit_idx"]}</v></c>',
            f'<c r="J{n}" s="14" t="s"><v>{d["net_idx"]}</v></c>',
            f'<c r="K{n}" s="14" t="s"><v>{d["net_idx"]}</v></c>',
            f'<c r="L{n}" s="14" t="s"><v>{d["net_idx"]}</v></c>',
            f'<c r="M{n}" s="14" t="s"><v>{d["da_idx"]}</v></c>',
            f'<c r="N{n}" s="19"/>',
            f'<c r="O{n}" s="20"/>',
            f'<c r="P{n}" s="20"/>',
            f'<c r="Q{n}" s="20"/>',
            f'<c r="R{n}" s="20" t="s"><v>{d["cat_idx"]}</v></c>',
            f'<c r="S{n}" s="21"/>',
            f'<c r="T{n}" s="21"/>',
            f'<c r="U{n}" s="13"/>',
            f'<c r="V{n}" s="15"><v>{d["qty"]}</v></c>',
            f'<c r="W{n}" s="15"><v>{d["summa"]}</v></c>',
            f'<c r="X{n}" s="15"/>',
            f'<c r="Y{n}" s="22" t="s"><v>{d["supplier_idx"]}</v></c>',
        ]
        return f'<row r="{n}">{"".join(c)}</row>'

    row1 = re.search(r'<row r="1"[^>]*>.*?</row>', sheet_xml, re.DOTALL)
    row2 = re.search(r'<row r="2"[^>]*>.*?</row>', sheet_xml, re.DOTALL)
    new_rows = [row1.group(0), row2.group(0)]
    for i, d in enumerate(rows_data, 3):
        new_rows.append(make_row(i, d))

    new_sheet_xml = re.sub(
        r'<sheetData>.*?</sheetData>',
        lambda m: '<sheetData>' + ''.join(new_rows) + '</sheetData>',
        sheet_xml, count=1, flags=re.DOTALL
    )
    new_sheet_xml = re.sub(r'<hyperlinks>.*?</hyperlinks>', '', new_sheet_xml, flags=re.DOTALL)

    rels_path = 'xl/worksheets/_rels/sheet1.xml.rels'
    if rels_path in parts:
        rels_xml = parts[rels_path].decode('utf-8')
        rels_xml = re.sub(r'<Relationship[^>]*?relationships/hyperlink"[^>]*?>', '', rels_xml, flags=re.DOTALL)
        parts[rels_path] = rels_xml.encode('utf-8')

    parts['xl/sharedStrings.xml'] = ''.join(sst_parts).encode('utf-8')
    parts['xl/worksheets/sheet1.xml'] = new_sheet_xml.encode('utf-8')

    out_path = Path(tempfile.mktemp(suffix='.xlsx'))
    with zipfile.ZipFile(str(out_path), 'w', zipfile.ZIP_DEFLATED) as zf:
        for name, data in parts.items():
            zf.writestr(name, data)
    return out_path


@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Слишком много запросов. Подождите немного и попробуйте снова.'}), 429


@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'Файл слишком большой. Максимум 10 МБ.'}), 413


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/parse', methods=['POST'])
@limiter.limit("10 per minute; 50 per hour; 100 per day")
def parse():
    if 'file' not in request.files:
        return jsonify({'error': 'Файл не загружен'}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'Файл не выбран'}), 400

    file_bytes = f.read()
    is_pdf = f.filename.lower().endswith('.pdf')

    try:
        # Шаг 1: пробуем pdfplumber (бесплатно, мгновенно)
        if is_pdf or file_bytes[:4] == b'%PDF':
            file_bytes = normalize_pdf(file_bytes)
            items, supplier, date_str, number = parse_with_pdfplumber(file_bytes)
            if items:
                return jsonify({'ok': True, 'data': {
                    'поставщик': supplier,
                    'дата': date_str,
                    'номер': number,
                    'позиции': items,
                    '_source': 'pdfplumber'
                }})

        # Шаг 2: fallback на Claude API (сканы, фото, нечитаемые PDF)
        data = recognize_invoice(file_bytes, is_pdf=is_pdf)
        data['_source'] = 'claude'
        return jsonify({'ok': True, 'data': data})

    except json.JSONDecodeError:
        return jsonify({'error': 'ИИ вернул некорректный ответ, попробуйте ещё раз'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/download', methods=['POST'])
@limiter.limit("20 per minute")
def download():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'Некорректный запрос'}), 400
    items    = body.get('items', [])
    supplier = body.get('supplier', '')

    if not items:
        return jsonify({'error': 'Нет позиций'}), 400
    if not isinstance(items, list) or len(items) > 500:
        return jsonify({'error': 'Слишком много позиций (максимум 500)'}), 400

    try:
        out_path = make_paloma_xlsx(items, supplier)
        date_tag = datetime.now().strftime("%d%m%Y_%H%M")
        filename = f"paloma_{date_tag}.xlsx"
        response = send_file(
            str(out_path),
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response.call_on_close(lambda: out_path.unlink(missing_ok=True))
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
