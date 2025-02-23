import os
from datetime import datetime

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


def date_diff(date1, date2, type=None):

    year = (datetime.strptime(date2, '%Y-%m').year - datetime.strptime(date1, '%Y-%m').year) * 12
    month = (datetime.strptime(date2, '%Y-%m').month - datetime.strptime(date1, '%Y-%m').month)

    if type == 'str':
        return str(year + month)

    return (year + month)


def google_authenticate_sheets():

    credentials_path = os.path.join(os.path.dirname(__file__), 'credentials.json')
    token_path = os.path.join(os.path.dirname(__file__), 'token.json')
    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    creds = None

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, scopes)

    if not creds or not creds.valid:

        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, scopes)
            creds = flow.run_local_server(port=0)

        with open(token_path, 'w') as token:
            token.write(creds.to_json())

    return build('sheets', 'v4', credentials=creds)


def google_sheets_update(sheet_id, range, body):

    is_success = None
    message = None
    
    try:

        service = google_authenticate_sheets()

        service.spreadsheets().values().update(
            spreadsheetId = sheet_id,
            range = range,
            valueInputOption = 'RAW',
            body = body
        ).execute()

        is_success = True 

    except Exception as err:

        is_success = False
        message = str(err)

    return (is_success, message)


