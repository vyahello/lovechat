#!/usr/bin/env node
/**
 * Compresses photos, then encrypts photos/ and script.js into data.enc (binary).
 * Also writes a tiny data.enc.js flag file (15 bytes) for production detection.
 *
 * Usage:  npm install sharp && node encrypt.js
 */
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;
const getRandomValues = buf => webcrypto.getRandomValues(buf);
const fs   = require('fs');
const path = require('path');
const rl   = require('readline').createInterface({ input: process.stdin, output: process.stdout });
let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }

const PHOTOS_DIR   = './photos';
const OUTPUT_BIN   = './data.enc';
const OUTPUT_FLAG  = './data.enc.js';
const ITERATIONS   = 100_000;
const MAX_PX       = 1920;
const QUALITY      = 82;

/* Explicit extra rotation for specific files (on top of EXIF auto-rotate) */
const EXTRA_ROTATE = {};

const MAGIC = Buffer.from('ENC1');

function ask(q) {
  return new Promise(r => rl.question(q, a => { rl.close(); r(a.trim()); }));
}

async function deriveKey(password, salt) {
  const raw = await subtle.importKey(
    'raw', Buffer.from(password, 'utf8'), 'PBKDF2', false, ['deriveKey']
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
}

async function encryptBuf(key, buf) {
  const iv = getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, buf);
  return { iv: Buffer.from(iv), data: Buffer.from(ct) };
}

/* Binary entry: [2B keyLen][key][12B iv][4B dataLen][data] */
function makeEntry(key, iv, data) {
  const keyBuf = Buffer.from(key, 'utf8');
  const hdr = Buffer.alloc(2 + keyBuf.length + 12 + 4);
  hdr.writeUInt16BE(keyBuf.length, 0);
  keyBuf.copy(hdr, 2);
  iv.copy(hdr, 2 + keyBuf.length);
  hdr.writeUInt32BE(data.length, 2 + keyBuf.length + 12);
  return Buffer.concat([hdr, data]);
}

async function readPhoto(filePath) {
  if (!sharp) return fs.readFileSync(filePath);
  const orig     = fs.statSync(filePath).size;
  const filename = path.basename(filePath);
  const extra    = EXTRA_ROTATE[filename] || 0;
  let pipeline = sharp(filePath).rotate();
  if (extra) pipeline = pipeline.rotate(extra);
  const buf = await pipeline
    .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();
  const pct = Math.round((1 - buf.length / orig) * 100);
  process.stdout.write(` (${(orig/1024/1024).toFixed(1)}MB → ${(buf.length/1024/1024).toFixed(1)}MB, -${pct}%)`);
  return buf;
}

async function main() {
  if (!sharp) console.warn('⚠ sharp not installed — photos will not be compressed. Run: npm install sharp\n');

  const password = await ask('Encryption password: ');
  if (!password) { console.error('Password cannot be empty.'); process.exit(1); }

  const confirm = await new Promise(r => {
    const r2 = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    r2.question('Confirm password: ', a => { r2.close(); r(a.trim()); });
  });
  if (password !== confirm) { console.error('Passwords do not match.'); process.exit(1); }

  const salt = getRandomValues(new Uint8Array(16));
  const key  = await deriveKey(password, salt);

  const chunks = [MAGIC, Buffer.from(salt)];

  /* Compress + encrypt photos */
  const exts  = /\.(jpe?g|png|gif|webp)$/i;
  const files = fs.readdirSync(PHOTOS_DIR).filter(f => exts.test(f));
  if (!files.length) { console.error(`No images found in ${PHOTOS_DIR}/`); process.exit(1); }

  console.log(`\nEncrypting ${files.length} photos...`);
  for (const file of files) {
    process.stdout.write(`  ✓ ${file}`);
    const raw = await readPhoto(path.join(PHOTOS_DIR, file));
    const { iv, data } = await encryptBuf(key, raw);
    chunks.push(makeEntry(file, iv, data));
    process.stdout.write('\n');
  }

  /* Encrypt script.js */
  if (!fs.existsSync('./script.js')) { console.error('script.js not found.'); process.exit(1); }
  console.log('\nEncrypting script.js...');
  const { iv: sIv, data: sData } = await encryptBuf(key, Buffer.from(fs.readFileSync('./script.js', 'utf8'), 'utf8'));
  chunks.push(makeEntry('script.js', sIv, sData));
  console.log('  ✓ script.js');

  /* Write binary output */
  const bin = Buffer.concat(chunks);
  fs.writeFileSync(OUTPUT_BIN, bin);
  const sizeMB = (bin.length / 1024 / 1024).toFixed(1);
  console.log(`\nDone → ${OUTPUT_BIN} (${sizeMB}MB)`);

  /* Write tiny flag file */
  fs.writeFileSync(OUTPUT_FLAG, 'const _ENC=1;');
  console.log(`     → ${OUTPUT_FLAG} (flag only)`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
