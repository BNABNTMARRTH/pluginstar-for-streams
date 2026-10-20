import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_DIR = path.join(__dirname, '../models/qwen');
const MODEL_NAME = 'qwen2.5-0.5b-instruct-q4_k_m.gguf';
const MODEL_PATH = path.join(MODEL_DIR, MODEL_NAME);

// URL oficial en HuggingFace
const MODEL_URL = 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf';

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(MODEL_DIR)) {
      fs.mkdirSync(MODEL_DIR, { recursive: true });
    }

    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      // Q4_K_M mide ~491 MB
      if (stats.size > 400 * 1024 * 1024) {
        console.log(`✔ El modelo ya existe en: ${destPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
        return resolve(destPath);
      }
    }

    console.log(`⬇ Descargando ${MODEL_NAME} desde Hugging Face...`);
    const tempPath = `${destPath}.tmp`;
    const file = fs.createWriteStream(tempPath);

    function fetchUrl(targetUrl) {
      https.get(targetUrl, (response) => {
        // Manejar redirecciones 301 / 302
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return fetchUrl(response.headers.location);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(tempPath);
          return reject(new Error(`Fallo de descarga: HTTP ${response.statusCode}`));
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastLoggedPct = -1;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const pct = Math.floor((downloadedBytes / totalBytes) * 100);
            if (pct % 10 === 0 && pct !== lastLoggedPct) {
              lastLoggedPct = pct;
              process.stdout.write(`Progreso de descarga: ${pct}% (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB / ${(totalBytes / 1024 / 1024).toFixed(1)} MB)\r`);
            }
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            fs.renameSync(tempPath, destPath);
            console.log(`\n✔ Modelo guardado exitosamente en: ${destPath}`);
            resolve(destPath);
          });
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        reject(err);
      });
    }

    fetchUrl(url);
  });
}

downloadFile(MODEL_URL, MODEL_PATH)
  .then(() => {
    console.log('🎉 Descarga de Qwen 2.5 (0.5B) completada.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error al descargar el modelo:', err.message);
    process.exit(1);
  });
