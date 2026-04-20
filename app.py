"""
PalomaBot Web — веб-сервис для парсинга накладных
Flask + Claude API → xlsx для Paloma365
"""
import os
import json
import base64
import re
import zipfile
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from html import escape as xml_escape

from flask import Flask, render_template, request, jsonify, send_file
import anthropic

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 20 MB

CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "")
TEMPLATE_PATH  = Path("items_template.xlsx")

PALOMA_HEADERS = [
    'Справочник товаров', 'Остатки', 'Код', 'Признак группы',
    'Наименование группы', 'Наименование', 'Цена', 'Штрихкоды',
    'Артикул', 'Национальный код товара', 'Ед. измерения', 'Услуга',
    'Весовой', 'Комбо', 'Использовать в меню', 'Plu код',
    'Подразделение', 'Описание', 'Изображения', 'Категория',
    'Тип цены:Оптовая', 'Тип цены:Партнерская', 'Организация',
    'Количество', 'Стоимость', 'Склад', 'Поставщик',
]

CLAUDE_PROMPT = """Ты парсер накладных/счетов-фактур. Извлеки все товарные позиции.

Верни ТОЛЬКО валидный JSON без markdown:
{
  "поставщик": "название ТОО или ИП",
  "дата": "дд.мм.гггг",
  "номер": "номер документа",
  "позиции": [
    {
      "название": "полное наименование товара",
      "артикул": "артикул или штрихкод (если есть, иначе пустая строка)",
      "количество": 10,
      "единица": "шт",
      "цена": 1500.0,
      "сумма": 15000.0,
      "категория": "Электрика"
    }
  ]
}

Категории: Сантехника, Электрика, Инструменты, Отделка, Крепёж, Стройматериалы, Другое.
Цена и количество — всегда числа. Если поле не читается — пустая строка или 0."""


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
    if "```" in raw:
        for chunk in raw.split("```"):
            chunk = chunk.strip().lstrip("json").strip()
            if chunk.startswith("{"):
                raw = chunk
                break

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


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/parse', methods=['POST'])
def parse():
    if 'file' not in request.files:
        return jsonify({'error': 'Файл не загружен'}), 400

    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'Файл не выбран'}), 400

    file_bytes = f.read()
    is_pdf = f.filename.lower().endswith('.pdf')

    try:
        data = recognize_invoice(file_bytes, is_pdf=is_pdf)
        return jsonify({'ok': True, 'data': data})
    except json.JSONDecodeError:
        return jsonify({'error': 'ИИ вернул некорректный ответ, попробуйте ещё раз'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/download', methods=['POST'])
def download():
    body = request.json
    items    = body.get('items', [])
    supplier = body.get('supplier', '')

    if not items:
        return jsonify({'error': 'Нет позиций'}), 400

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
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
