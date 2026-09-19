import sqlite3
import os
import shutil
import json
import re

db_src = os.path.join(os.environ['LOCALAPPDATA'], 'Google', 'DriveFS', '112981249855484435651', 'metadata_sqlite_db')
db_dst = os.path.join(os.environ['TEMP'], 'drive_metadata_export.db')

print("Copiando metadata_sqlite_db...")
shutil.copyfile(db_src, db_dst)

conn = sqlite3.connect(db_dst)
cur = conn.cursor()

print("Consultando items activos de Google Drive...")
cur.execute("SELECT id, local_title FROM items WHERE trashed = 0")
rows = cur.fetchall()

by_exact_name = {}
by_videoid = {}
id_regex = re.compile(r'\[([a-zA-Z0-9_-]{11})\]', re.IGNORECASE)

for file_id, local_title in rows:
    if local_title:
        by_exact_name[local_title] = file_id
        m = id_regex.search(local_title)
        if m:
            by_videoid[m.group(1)] = file_id

print(f"Indexados de Drive: {len(by_exact_name)} títulos, {len(by_videoid)} videoIds.")

songs_dir = r"H:\Mi unidad\02_Desarrollo_y_Apps\APP\Empresas\APP Karaoke\Canciones_Descargadas"
disk_files = [f for f in os.listdir(songs_dir) if not f.startswith('.') and f.endswith(('.mp4', '.webm', '.mkv'))]

mapping = {}
matched = 0
missing = []

for filename in disk_files:
    m = id_regex.search(filename)
    vid = m.group(1) if m else None
    
    file_id = None
    if filename in by_exact_name:
        file_id = by_exact_name[filename]
    elif vid and vid in by_videoid:
        file_id = by_videoid[vid]
        
    if file_id:
        mapping[vid if vid else filename] = {
            "driveFileId": file_id,
            "filename": filename,
            "videoId": vid,
            "driveStreamUrl": f"https://drive.usercontent.google.com/download?id={file_id}&export=download"
        }
        matched += 1
    else:
        missing.append(filename)

print(f"Coincidencias exitosas: {matched} de {len(disk_files)}")
if missing:
    print(f"Faltantes ({len(missing)}):", missing[:10])

output_path = os.path.join(r"H:\Mi unidad\02_Desarrollo_y_Apps\APP\Empresas\APP Karaoke\scripts", "drive_file_ids.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(mapping, f, indent=2, ensure_ascii=False)

print(f"Archivo guardado exitosamente en: {output_path}")
conn.close()
