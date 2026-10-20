// scripts/download_model.js
// Descarga y empaqueta SmolLM2-135M-Instruct en public/models/smollm2/

import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct/resolve/main/';
const DEST_DIR = path.join(__dirname, '..', 'public', 'models', 'smollm2');

const FILES = [
  'config.json',
  'generation_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'special_tokens_map.json',
  'vocab.json',
  'merges.txt',
  'onnx/model_q4f16.onnx',
  'onnx/model_q4.onnx'
];

async function downloadFile(fileRelPath) {
  const destPath = path.join(DEST_DIR, fileRelPath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
    console.log(`[SKIP] Ya existe: ${fileRelPath} (${(fs.statSync(destPath).size / 1024 / 1024).toFixed(2)} MB)`);
    return;
  }

  const fileUrl = BASE_URL + fileRelPath;
  console.log(`[START] Descargando: ${fileRelPath}...`);

  const res = await fetch(fileUrl, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status} al descargar ${fileUrl}`);
  }

  const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
  let downloadedBytes = 0;
  const outStream = fs.createWriteStream(destPath);

  const reader = res.body.getReader();
  const stream = new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) {
        this.push(null);
      } else {
        downloadedBytes += value.length;
        if (totalBytes > 0 && totalBytes > 1024 * 1024) {
          const pct = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r[PROGRESS] ${fileRelPath}: ${pct}% (${(downloadedBytes / 1024 / 1024).toFixed(1)}MB / ${(totalBytes / 1024 / 1024).toFixed(1)}MB)`);
        }
        this.push(value);
      }
    }
  });

  await finished(stream.pipe(outStream));
  if (totalBytes > 1024 * 1024) process.stdout.write('\n');
  console.log(`[DONE] ${fileRelPath} (${(fs.statSync(destPath).size / 1024 / 1024).toFixed(2)} MB)`);
}

async function run() {
  console.log(`=== Empaquetando SmolLM2 en ${DEST_DIR} ===`);
  for (const f of FILES) {
    try {
      await downloadFile(f);
    } catch (err) {
      console.error(`[ERROR] Falló descarga de ${f}:`, err.message);
      process.exit(1);
    }
  }
  console.log('=== Todos los archivos de SmolLM2 se empaquetaron exitosamente! ===');
}

run();
