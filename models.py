from datetime import datetime
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db_name = 'casa'

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_name}.db'
db = SQLAlchemy(app)

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    alias = db.Column(db.String(50), unique=True, nullable=False)

class Institution(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    alias = db.Column(db.String(50), unique=True, nullable=False)

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.now())
    value = db.Column(db.Float, nullable=False)
    institution_id = db.Column(db.Integer, db.ForeignKey('institution.id'), nullable=False)
    method = db.Column(db.String(10), nullable=False)
    installments = db.Column(db.Integer, nullable=False, default=1)
    description = db.Column(db.String(200))
    category = db.relationship('Category', backref=db.backref('payments', lazy=True))
    institution = db.relationship('Institution', backref=db.backref('payments', lazy=True))

with app.app_context():
    db.create_all()
