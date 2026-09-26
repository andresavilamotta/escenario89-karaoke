import sqlite3
import os

dst = os.path.join(os.environ['TEMP'], 'm_copy.db')
conn = sqlite3.connect(dst)
cur = conn.cursor()
cur.execute("SELECT stable_id, id, local_title FROM items WHERE local_title LIKE '%Nadie Es Eterno%' LIMIT 5")
for row in cur.fetchall():
    print(row)
conn.close()
