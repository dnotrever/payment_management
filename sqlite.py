import sqlite3

conexao = sqlite3.connect('instance/casa.db')
cursor = conexao.cursor()

cursor.execute("UPDATE payment SET installments = 0 WHERE id = 96")

conexao.commit()
conexao.close()
