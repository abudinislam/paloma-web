import hashlib
from datetime import datetime, timezone
from extensions import db


class AccessKey(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    key_hash      = db.Column(db.String(64), unique=True, nullable=False)
    label         = db.Column(db.String(100), default='')
    monthly_limit = db.Column(db.Integer, default=100)
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    @staticmethod
    def hash(password):
        return hashlib.sha256(password.encode()).hexdigest()

    def monthly_usage(self):
        today = datetime.now(timezone.utc)
        return Invoice.query.filter(
            Invoice.key_id == self.id,
            db.func.strftime('%Y-%m', Invoice.created_at) == today.strftime('%Y-%m')
        ).count()

    def remaining(self):
        return max(0, self.monthly_limit - self.monthly_usage())


class Invoice(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    key_id      = db.Column(db.Integer, db.ForeignKey('access_key.id'), nullable=True)
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
