from datetime import datetime, timezone
from extensions import db


class Invoice(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    doc         = db.Column(db.String(200))
    supplier    = db.Column(db.String(200))
    items_count = db.Column(db.Integer)
    total       = db.Column(db.Float)
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'doc': self.doc,
            'supplier': self.supplier,
            'items': self.items_count,
            'total': self.total,
            'date': self.created_at.strftime('%d.%m.%Y'),
            'time': self.created_at.strftime('%H:%M'),
        }
