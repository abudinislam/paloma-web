import csv
import io


def make_csv(items, supplier, date_str='', number=''):
    out = io.StringIO()
    writer = csv.writer(out, delimiter=';')

    if supplier:
        writer.writerow(['Поставщик:', supplier])
    if number:
        writer.writerow(['Документ №:', number])
    if date_str:
        writer.writerow(['Дата:', date_str])
    if supplier or number or date_str:
        writer.writerow([])

    writer.writerow(['№', 'Наименование', 'Артикул', 'Кол-во', 'Ед.', 'Цена', 'Сумма', 'Категория'])
    for i, item in enumerate(items, 1):
        writer.writerow([
            i,
            item.get('название', ''),
            item.get('артикул', ''),
            item.get('количество', 1),
            item.get('единица', 'шт'),
            item.get('цена', 0),
            item.get('сумма', 0),
            item.get('категория', ''),
        ])

    # UTF-8 BOM для корректного открытия в Excel
    return '﻿' + out.getvalue()
