import sqlite3

def database_management(infos):

    conexao = sqlite3.connect('instance/casa.db')
    cursor = conexao.cursor()

    _operations = {

        'update': lambda: cursor.execute(
            f"UPDATE {infos['table']} SET {infos['field']} = ? WHERE id = ?",
            (infos['value'], infos['id'])
        ),

        'delete': lambda: cursor.execute(
            f"DELETE FROM {infos['table']} WHERE id = ?",
            (infos['id'],)
        ),

        'insert': lambda: cursor.execute(
            f"INSERT INTO {infos['table']} ({', '.join(infos['fields'].keys())}) "
            f"VALUES ({', '.join(['?' for _ in infos['fields']])})",
            tuple(infos['fields'].values())
        ),

    }

    if infos['operation'] in _operations:
        _operations[infos['operation']]()
    else:
        print('Invalid operation!')

    conexao.commit()
    conexao.close()

infos = {
    'operation': 'delete',
    'table': 'payment',
    'id': '24',
    'fields': {
        'name': 'Light',
        'alias': 'light',
    },
    'field': 'category_id',
    'value': '12',
}

database_management(infos)