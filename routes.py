import json
import os
from datetime import datetime, timezone
from functools import wraps

from flask import Blueprint, render_template, request, jsonify, send_file, session, redirect, url_for

from extensions import db
from models import Invoice, AccessKey
from parsers.pdf import parse_with_pdfplumber, normalize_pdf
from parsers.ai import recognize_invoice
from exporters.xlsx import make_paloma_xlsx
from exporters.csv import make_csv

bp = Blueprint('main', __name__)
CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "")
APP_PASSWORD = os.environ.get("APP_PASSWORD", "")


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('logged_in'):
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Требуется авторизация', 'redirect': '/login'}), 401
            return redirect(url_for('main.login'))
        return f(*args, **kwargs)
    return decorated


@bp.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'Файл слишком большой. Максимум 10 МБ.'}), 413


@bp.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('logged_in'):
        return redirect(url_for('main.index'))
    error = None
    if request.method == 'POST':
        password = request.form.get('password', '')
        key = AccessKey.query.filter_by(key_hash=AccessKey.hash(password)).first()
        if key:
            session['logged_in'] = True
            session['key_id'] = key.id
            return redirect(url_for('main.index'))
        error = 'Неверный пароль'
    return render_template('login.html', error=error)


@bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('main.login'))


@bp.route('/')
@login_required
def index():
    return render_template('index.html')


@bp.route('/api/parse', methods=['POST'])
@login_required
def parse():
    if 'file' not in request.files:
        return jsonify({'error': 'Файл не загружен'}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'Файл не выбран'}), 400

    key = AccessKey.query.get(session.get('key_id'))
    if key and key.remaining() <= 0:
        return jsonify({'error': f'Достигнут лимит {key.monthly_limit} накладных в месяц. Лимит обновится 1-го числа.'}), 429

    file_bytes = f.read()
    is_pdf = f.filename.lower().endswith('.pdf')

    try:
        if is_pdf or file_bytes[:4] == b'%PDF':
            file_bytes = normalize_pdf(file_bytes)
            items, supplier, date_str, number = parse_with_pdfplumber(file_bytes)
            if items:
                data = {'поставщик': supplier, 'дата': date_str, 'номер': number,
                        'позиции': items, '_source': 'pdfplumber'}
                _save_invoice(data)
                return jsonify({'ok': True, 'data': data})

        data = recognize_invoice(file_bytes, api_key=CLAUDE_API_KEY, is_pdf=is_pdf)
        if data.get('not_invoice'):
            return jsonify({'error': 'Документ не похож на накладную или счёт. Загрузите товарный документ.'}), 422
        if not data.get('позиции'):
            return jsonify({'error': 'ИИ не смог извлечь позиции из документа. Проверьте качество файла.'}), 422
        data['_source'] = 'claude'
        _save_invoice(data)
        return jsonify({'ok': True, 'data': data})

    except json.JSONDecodeError:
        return jsonify({'error': 'ИИ вернул некорректный ответ, попробуйте ещё раз'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _save_invoice(data):
    from flask import session as flask_session
    positions = data.get('позиции', [])
    total = sum(float(p.get('сумма', 0) or 0) for p in positions)
    num = data.get('номер', '')
    entry = Invoice(
        key_id=flask_session.get('key_id'),
        doc=f"Документ №{num}" if num else "Накладная",
        supplier=data.get('поставщик', '') or '—',
        items_count=len(positions),
        total=total,
    )
    db.session.add(entry)
    db.session.commit()


@bp.route('/api/quota')
@login_required
def quota():
    key = AccessKey.query.get(session.get('key_id'))
    if not key:
        return jsonify({'remaining': None, 'limit': None})
    return jsonify({'remaining': key.remaining(), 'limit': key.monthly_limit})


@bp.route('/api/history')
@login_required
def history():
    today = datetime.now(timezone.utc).date()
    rows = Invoice.query.order_by(Invoice.created_at.desc()).limit(50).all()
    today_count = Invoice.query.filter(
        db.func.date(Invoice.created_at) == today
    ).count()
    total_items = db.session.query(db.func.sum(Invoice.items_count)).scalar() or 0
    return jsonify({
        'entries': [r.to_dict() for r in rows],
        'today_count': today_count,
        'total_count': Invoice.query.count(),
        'total_items': total_items,
    })


@bp.route('/api/history/clear', methods=['POST'])
@login_required
def history_clear():
    Invoice.query.delete()
    db.session.commit()
    return jsonify({'ok': True})


@bp.route('/api/download', methods=['POST'])
@login_required
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
        date_tag = datetime.now(timezone.utc).strftime("%d%m%Y_%H%M")
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


@bp.route('/api/download/csv', methods=['POST'])
@login_required
def download_csv():
    from flask import Response
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'Некорректный запрос'}), 400
    items    = body.get('items', [])
    supplier = body.get('supplier', '')
    date_str = body.get('date', '')
    number   = body.get('number', '')

    if not items:
        return jsonify({'error': 'Нет позиций'}), 400

    date_tag = datetime.now(timezone.utc).strftime("%d%m%Y_%H%M")
    filename = f"nakladnaya_{date_tag}.csv"
    content = make_csv(items, supplier, date_str, number)
    return Response(
        content,
        mimetype='text/csv; charset=utf-8',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )
