import zipfile
import tempfile
from pathlib import Path
from html import escape as xe

_CT = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"           ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml"  ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml"      ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>'''

_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''

_WB = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Поступление" sheetId="1" r:id="rId1"/></sheets>
</workbook>'''

_WB_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"    Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>'''


def make_paloma_in_xlsx(items):
    """Простой Excel: Наименование | Количество | Цена — для импорта поступления в Paloma 365."""
    strings = []
    idx = {}

    def si(s):
        s = str(s)
        if s not in idx:
            idx[s] = len(strings)
            strings.append(s)
        return idx[s]

    HEADERS = ['Наименование', 'Количество', 'Цена']
    for h in HEADERS:
        si(h)

    rows_xml = []

    # Заголовок
    rows_xml.append(
        f'<row r="1">'
        f'<c r="A1" t="s"><v>{si("Наименование")}</v></c>'
        f'<c r="B1" t="s"><v>{si("Количество")}</v></c>'
        f'<c r="C1" t="s"><v>{si("Цена")}</v></c>'
        f'</row>'
    )

    for i, item in enumerate(items, 2):
        name = str(item.get('название', '') or item.get('name', '')).strip()
        qty  = item.get('количество', item.get('qty', 1)) or 1
        price = float(item.get('цена', item.get('price', 0)) or 0)
        rows_xml.append(
            f'<row r="{i}">'
            f'<c r="A{i}" t="s"><v>{si(name)}</v></c>'
            f'<c r="B{i}"><v>{qty}</v></c>'
            f'<c r="C{i}"><v>{price}</v></c>'
            f'</row>'
        )

    sheet = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<sheetData>' + ''.join(rows_xml) + '</sheetData>'
        '</worksheet>'
    )

    sst = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{len(strings)}" uniqueCount="{len(strings)}">'
        + ''.join(f'<si><t xml:space="preserve">{xe(s)}</t></si>' for s in strings)
        + '</sst>'
    )

    fd, out_path = tempfile.mkstemp(suffix='.xlsx')
    import os; os.close(fd)
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('[Content_Types].xml',          _CT)
        zf.writestr('_rels/.rels',                  _RELS)
        zf.writestr('xl/workbook.xml',              _WB)
        zf.writestr('xl/_rels/workbook.xml.rels',   _WB_RELS)
        zf.writestr('xl/worksheets/sheet1.xml',     sheet)
        zf.writestr('xl/sharedStrings.xml',         sst)
    return Path(out_path)
