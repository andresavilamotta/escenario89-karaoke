import sqlite3
import os
import re

# Directorio de canciones
local_dir = r"H:\Mi unidad\02_Desarrollo_y_Apps\APP\Empresas\APP Karaoke\Canciones_Descargadas"
files = os.listdir(local_dir)
print(f"Total files on disk: {len(files)}")

# Base de datos DriveFS
dst = os.path.join(os.environ['TEMP'], 'm_copy.db')
conn = sqlite3.connect(dst)
cur = conn.cursor()

# Mapear todos los items con id y local_title
cur.execute("SELECT id, local_title FROM items WHERE trashed = 0 AND mime_type = 'video/mp4'")
db_items = cur.fetchall()
print(f"Total video/mp4 items in DriveFS DB: {len(db_items)}")

# Crear mapa por nombre exacto y por [videoId]
by_name = {}
by_videoid = {}
id_regex = re.compile(r'\[([a-zA-Z0-9_-]{11})\]\.mp4', re.IGNORECASE)

for drive_id, title in db_items:
    if title:
        by_name[title] = drive_id
        m = id_regex.search(title)
        if m:
            by_videoid[m.group(1)] = drive_id

matched_disk = 0
for f in files:
    m = id_regex.search(f)
    vid = m.group(1) if m else None
    if f in by_name or (vid and vid in by_videoid):
        matched_disk += 1

print(f"Total files on disk matched with Google Drive File ID: {matched_disk} / {len(files)}")
conn.close()
