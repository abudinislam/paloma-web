"""
routes.py — Flask маршруты.
"""
import json
import logging
from datetime import datetime

from flask import render_template, request, jsonify, send_file, after_this_request

from .parser import parse_with_pdfplumber
from .ai_client import recognize_invoice
from .xlsx_writer import make_paloma_xlsx

logger = logging.getLogger(__name__)


def register_routes(app, limiter):

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/parse', methods=['POST'])
    @limiter.limit("20 per minute")
    def parse():
        if 'file' not in request.files:
            return jsonify({'error': 'Файл не загружен'}), 400
        f = request.files['file']
        if not f.filename:
            return jsonify({'error': 'Файл не выбран'}), 400

        file_bytes = f.read()
        is_pdf = f.filename.lower().endswith('.pdf')
        logger.info("parse request: file=%s size=%d bytes", f.filename, len(file_bytes))

        try:
            if is_pdf or file_bytes[:4] == b'%PDF':
                items, supplier, date_str, number = parse_with_pdfplumber(file_bytes)
                if items:
                    logger.info("pdfplumber success: %d items", len(items))
                    return jsonify({'ok': True, 'data': {
                        'поставщик': supplier,
                        'дата': date_str,
                        'номер': number,
                        'позиции': items,
                        '_source': 'pdfplumber'
                    }})

            data = recognize_invoice(file_bytes, is_pdf=is_pdf)
            data['_source'] = 'claude'
            logger.info("claude success: %d items", len(data.get('позиции', [])))
            return jsonify({'ok': True, 'data': data})

        except json.JSONDecodeError:
            logger.error("JSON decode error from Claude response")
            return jsonify({'error': 'ИИ вернул некорректный ответ, попробуйте ещё раз'}), 500
        except Exception as e:
            logger.exception("parse error: %s", e)
            return jsonify({'error': str(e)}), 500

    @app.route('/api/download', methods=['POST'])
    @limiter.limit("30 per minute")
    def download():
        body = request.json
        items    = body.get('items', [])
        supplier = body.get('supplier', '')

        if not items:
            return jsonify({'error': 'Нет позиций'}), 400

        try:
            out_path = make_paloma_xlsx(items, supplier)

            @after_this_request
            def cleanup(response):
                try:
                    out_path.unlink(missing_ok=True)
                except Exception as cleanup_err:
                    logger.warning("temp file cleanup failed: %s", cleanup_err)
                return response

            date_tag = datetime.now().strftime("%d%m%Y_%H%M")
            filename = f"paloma_{date_tag}.xlsx"
            return send_file(
                str(out_path),
                as_attachment=True,
                download_name=filename,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        except Exception as e:
            logger.exception("download error: %s", e)
            return jsonify({'error': str(e)}), 500

    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify({'error': 'Файл слишком большой. Максимум 10 МБ.'}), 413

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({'error': 'Слишком много запросов. Подожди немного.'}), 429
