import os
import locale
import unidecode
from datetime import datetime
from dotenv import load_dotenv
from dateutil.relativedelta import relativedelta
from models import app, db, db_name, Category, Institution, Payment
from flask import render_template, request, jsonify

import utils as ut

locale.setlocale(locale.LC_ALL, 'pt_BR.UTF-8')


@app.route('/')
def index():
    payment_title = db_name
    return render_template('index.html', payment_title=payment_title)

@app.route('/payments', methods=['POST'])
def add_payment():

    data = request.get_json()

    category = Category.query.filter_by(alias=data['category']).first()
    institution = Institution.query.filter_by(alias=data['institution']).first()
    
    payment = Payment(
        category_id = category.id,
        date = datetime.strptime(data['date'], '%d/%m/%Y'),
        value = locale.atof(data['value']),
        institution_id = institution.id,
        method = data['method'],
        installments = data['installments'] if data['method'] == 'Credit' else 0,
        description = data['description']
    )

    db.session.add(payment)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Payment created successfully.'})

@app.route('/payment/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def get_payment(id):

    payment = Payment.query.get(id)

    if request.method == 'GET':

        payment_category = Category.query.get(payment.category_id)
        payment_institution = Institution.query.get(payment.institution_id)

        data = {
            'category_name': payment_category.name,
            'category_alias': payment_category.alias,
            'date': payment.date.strftime('%d/%m/%Y'),
            'value': payment.value,
            'institution_name': payment_institution.name,
            'institution_alias': payment_institution.alias,
            'method': payment.method,
            'installments': payment.installments,
            'description': payment.description
        }

        return jsonify(data)
    
    if request.method == 'PUT':

        data = request.get_json()

        category = Category.query.filter_by(alias=data['category']).first()
        institution = Institution.query.filter_by(alias=data['institution']).first()

        payment.category_id = category.id
        payment.institution_id = institution.id
        payment.date = datetime.strptime(data['date'], '%d/%m/%Y')
        payment.value = data['value']
        payment.method = data['method']
        payment.installments = data['installments'] if data['method'] == 'Credit' else 0
        payment.description = data['description']

        db.session.commit()

        return jsonify({'success': True, 'message': 'Payment updated successfully.'})

    if request.method == 'DELETE':

        db.session.delete(payment)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Payment deleted successfully.'})

@app.route('/payments/<int:year>/<int:month>', methods=['GET'])
def get_payments(year, month):

    payments = Payment.query.all()

    response = []

    for payment in payments:

        category = Category.query.get(payment.category_id)
        institution = Institution.query.get(payment.institution_id)

        data = {
            'id': payment.id,
            'category_name': category.name,
            'category_alias': category.alias,
            'date': payment.date.strftime('%d/%m/%Y'),
            'institution_name': institution.name,
            'institution_alias': institution.alias,
            'method': payment.method,
            'description': payment.description
        }

        itau_condition = (
            institution.name == 'Itaú' and
            payment.method == 'Credit' and
            payment.date.day <= 10
        )

        payment_date = payment.date.strftime('%Y-%m')
        payment_value = payment.value
        payment_installments = payment.installments

        if not itau_condition:
            installment_limit = (payment.date + relativedelta(months=payment_installments)).strftime('%Y-%m')
        else:
            installment_limit = (payment.date + relativedelta(months=payment_installments - 1)).strftime('%Y-%m')

        current_date = f'{year}-{month:02}'

        if not itau_condition:

            if payment_date == current_date:
                data['value'] = payment_value
                data['installments'] = payment_installments
                response.append(data)

            elif current_date <= installment_limit and current_date >= payment_date:
                data['value'] = payment_value / payment_installments
                data['installments'] = ut.date_diff(payment_date, current_date, type='str') + ' / ' + str(payment_installments)
                response.append(data)

        else:

            if payment_date == current_date:
                data['value'] = payment_value / payment_installments
                data['installments'] = '1 / ' + str(payment_installments) if payment_installments > 1 else payment_installments
                response.append(data)

            elif current_date <= installment_limit and current_date >= payment_date:
                data['value'] = payment_value / payment_installments
                data['installments'] = ut.date_diff(payment_date, current_date, type='str') + ' / ' + str(payment_installments)
                response.append(data)
        
    response_sorted = sorted(response, key=lambda x: datetime.strptime(x['date'], '%d/%m/%Y'), reverse=True)

    return jsonify(response_sorted)

@app.route('/categories', methods=['POST'])
def add_category():
    data = request.get_json()
    alias = unidecode.unidecode(data['name'].replace(' ', '-').lower())
    category = Category(name=data['name'], alias=alias)
    db.session.add(category)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/institutions', methods=['POST'])
def add_institution():
    data = request.get_json()
    alias = unidecode.unidecode(data['name'].replace(' ', '-').lower())
    institution = Institution(name=data['name'], alias=alias)
    db.session.add(institution)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.query.order_by(Category.name).all()
    return jsonify([{ 'id': cat.id, 'alias': cat.alias, 'name': cat.name } for cat in categories])

@app.route('/institutions', methods=['GET'])
def get_institutions():
    institutions = Institution.query.order_by(Institution.name).all()
    return jsonify([{ 'alias': inst.alias, 'name': inst.name } for inst in institutions])

@app.route('/update-spreadsheets', methods=['GET'])
def update_spreadsheets():

    is_success = None
    message = None
    context = None

    try:

        method = request.args.get('method')

        if method.lower() == 'debit':

            load_dotenv()

            sheet_id = os.getenv('SPREADSHEET_ID')

            month = request.args.get('month')
            year = request.args.get('year')
            supermercado_amount = request.args.get('supermercado')
            outros_amount = request.args.get('outros')

            month_column = chr(ord('C') + int(month))

            supermercado_line = f'{year}!{month_column}6'
            outros_line = f'{year}!{month_column}12'

            values_supermercado = [
                [float(supermercado_amount)]
            ]

            values_outros = [
                [float(outros_amount)]
            ]

            body_supermercado = {
                'values': values_supermercado
            }

            body_outros = {
                'values': values_outros
            }

            # supermercado update
            update_supermercado = ut.google_sheets_update(sheet_id, supermercado_line, body_supermercado)

            # update outros
            update_outros = ut.google_sheets_update(sheet_id, outros_line, body_outros)

            if (update_supermercado[0] and update_outros[0]):

                is_success = True
                message = 'Spreadsheets updated successfully!'

            else:

                is_success = False
                message = 'An error occurred...'
        
        else:

            is_success = False
            message = 'Update do Sheets com crédito ainda não implementado.'

    except Exception as err:

        is_success = False
        message = str(err)
    
    finally:

        return jsonify({
            'success': is_success,
            'message': message,
            'context': context
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
