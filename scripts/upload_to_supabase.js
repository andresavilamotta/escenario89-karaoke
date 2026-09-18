import fs from 'fs';
import path from 'path';

/**
 * Script de Subida en Lote a Supabase Storage
 * Sube los 32 videos MP4 de Canciones_Descargadas/ al bucket "karaoke-pistas"
 * 
 * Uso:
 *   node scripts/upload_to_supabase.js <SUPABASE_URL> <SUPABASE_KEY>
 * o configurando las variables de entorno SUPABASE_URL y SUPABASE_KEY
 */

const SUPABASE_URL = (process.argv[2] || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.argv[3] || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
const BUCKET_NAME = 'karaoke-pistas';
const LOCAL_DIR = path.resolve('Canciones_Descargadas');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n❌ ERROR: Faltan credenciales de Supabase.');
  console.error('Uso: node scripts/upload_to_supabase.js <SUPABASE_URL> <SUPABASE_KEY>\n');
  process.exit(1);
}

if (!fs.existsSync(LOCAL_DIR)) {
  console.error(`\n❌ ERROR: No se encontró la carpeta: ${LOCAL_DIR}`);
  process.exit(1);
}

async function ensureBucketExists() {
  console.log(`\n🔍 Verificando existencia del bucket público "${BUCKET_NAME}" en Supabase...`);
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET_NAME}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      }
    });

    if (res.status === 200) {
      console.log(`   ✅ Bucket "${BUCKET_NAME}" verificado y listo.`);
      return true;
    }

    if (res.status === 404) {
      console.log(`   ⚙️ Bucket no encontrado. Creando bucket público "${BUCKET_NAME}"...`);
      const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: BUCKET_NAME,
          name: BUCKET_NAME,
          public: true,
          file_size_limit: 524288000, // 500MB
          allowed_mime_types: ['video/mp4', 'video/webm', 'video/quicktime'],
        })
      });

      if (!createRes.ok) {
        const errJson = await createRes.json();
        console.warn(`   ⚠️ Respuesta al crear bucket: ${JSON.stringify(errJson)}`);
      } else {
        console.log(`   ✅ Bucket público "${BUCKET_NAME}" creado exitosamente.`);
      }
      return true;
    }
  } catch (err) {
    console.warn(`   ⚠️ No se pudo comprobar el bucket mediante API: ${err.message}`);
  }
  return true;
}

async function uploadFile(filename, index, total) {
  const filePath = path.join(LOCAL_DIR, filename);
  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  const storageKey = encodeURIComponent(filename);

  console.log(`[${index + 1}/${total}] 📤 Subiendo (${sizeMB} MB): "${filename}"...`);

  const fileBuffer = fs.readFileSync(filePath);

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${storageKey}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`   ❌ Fallo al subir (HTTP ${res.status}): ${errText}`);
    return { filename, success: false, error: errText };
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storageKey}`;
  console.log(`   ✅ Subido exitosamente. URL CDN: ${publicUrl}\n`);
  return { filename, success: true, publicUrl };
}

async function main() {
  await ensureBucketExists();

  const files = fs.readdirSync(LOCAL_DIR).filter((f) => f.endsWith('.mp4'));
  console.log(`\n=======================================================`);
  console.log(` INICIANDO SUBIDA DE ${files.length} VIDEOS A SUPABASE STORAGE`);
  console.log(` Bucket: ${BUCKET_NAME}`);
  console.log(`=======================================================\n`);

  const results = [];
  for (let i = 0; i < files.length; i++) {
    const result = await uploadFile(files[i], i, files.length);
    results.push(result);
  }

  const ok = results.filter((r) => r.success).length;
  const fail = results.filter((r) => !r.success).length;

  console.log(`\n=======================================================`);
  console.log(` RESUMEN DE SUBIDA A SUPABASE STORAGE`);
  console.log(` Exitosos: ${ok} / ${files.length}`);
  console.log(` Fallidos:  ${fail} / ${files.length}`);
  console.log(`=======================================================\n`);

  // Actualizar .env.local con la URL pública base de Supabase Storage
  const cdnBase = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`;
  console.log(`📌 Recuerda agregar a tu .env o .env.local:\nVITE_SUPABASE_STORAGE_URL=${cdnBase}\n`);
}

main().catch(console.error);
