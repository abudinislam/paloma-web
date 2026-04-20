"""
xlsx_writer.py — генерация xlsx-файла для импорта в Paloma365.
"""
import os
import re
import zipfile
import tempfile
from pathlib import Path
from html import escape as xml_escape

from .config import TEMPLATE_PATH, PALOMA_HEADERS


def make_paloma_xlsx(items: list, supplier: str) -> Path:
    """Создаёт xlsx-файл на основе шаблона. Возвращает Path к temp-файлу."""
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
            'cat_idx':  get_idx(cat),
            'name_idx': get_idx(name),
            'art_idx':  get_idx(art) if art else None,
            'unit_idx': get_idx(unit),
            'net_idx':  get_idx('Нет'),
            'da_idx':   get_idx('Да'),
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
        return f'<row r="{n}">{" ".join(c)}</row>'

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

    # Безопасное создание временного файла (mkstemp вместо устаревшего mktemp)
    fd, tmp_path = tempfile.mkstemp(suffix='.xlsx')
    os.close(fd)
    out_path = Path(tmp_path)

    with zipfile.ZipFile(str(out_path), 'w', zipfile.ZIP_DEFLATED) as zf:
        for name, data in parts.items():
            zf.writestr(name, data)
    return out_path
