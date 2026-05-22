#!/usr/bin/env node
/**
 * Compresses photos, then encrypts photos/ and script.js into data.enc (binary).
 * Also writes a tiny data.enc.js flag file (15 bytes) for production detection.
 *
 * Asks for date (DDMMYYYY) and venue separately.
 * Encrypts __date_check__ with date-only key so step-1 can validate the date.
 * Encrypts everything else with date+venue combined key.
 *
 * Usage:  npm install sharp && node encrypt.js
 */
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;
const getRandomValues = buf => webcrypto.getRandomValues(buf);
const fs   = require('fs');
const path = require('path');

const PHOTOS_DIR   = './photos';
const VOICES_DIR   = './voices';
const OUTPUT_BIN   = './data.enc';
const OUTPUT_FLAG  = './data.enc.js';
const ITERATIONS   = 100_000;
const MAX_PX       = 1920;
const QUALITY      = 82;

const EXTRA_ROTATE = {};

const MAGIC = Buffer.from('ENC1');

let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }

const _rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise(r => _rl.question(q, a => r(a.trim())));
}
function askClose() { _rl.close(); }

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

  /* --- Date and venue: from CLI args (encrypt.sh) or interactive --- */
  const [,, argDate, argVenue] = process.argv;
  const dateStr = argDate || await ask('Date answer (DDMMYYYY, e.g. 15032023): ');
  if (!dateStr) { console.error('Date cannot be empty.'); process.exit(1); }
  if (!/^\d{8}$/.test(dateStr)) { console.error('Date must be exactly 8 digits: DDMMYYYY'); process.exit(1); }

  const venueStr = argVenue || await ask('Venue answer (lowercase, as user will type it): ');
  if (!venueStr) { console.error('Venue cannot be empty.'); process.exit(1); }
  askClose();

  const fullPassword = dateStr + venueStr.toLowerCase().trim();
  console.log(`\nFull password: "${fullPassword}"`);

  const salt    = getRandomValues(new Uint8Array(16));
  const dateKey = await deriveKey(dateStr, salt);
  const fullKey = await deriveKey(fullPassword, salt);

  const chunks = [MAGIC, Buffer.from(salt)];

  /* __date_check__: encrypted with date-only key — lets step 1 validate the date */
  console.log('\nAdding date check marker...');
  const { iv: dcIv, data: dcData } = await encryptBuf(dateKey, Buffer.from('ok'));
  chunks.push(makeEntry('__date_check__', dcIv, dcData));
  console.log('  ✓ __date_check__');

  /* Compress + encrypt photos with full key */
  const exts  = /\.(jpe?g|png|gif|webp)$/i;
  const files = fs.readdirSync(PHOTOS_DIR).filter(f => exts.test(f));
  if (!files.length) { console.error(`No images found in ${PHOTOS_DIR}/`); process.exit(1); }

  console.log(`\nEncrypting ${files.length} photos...`);
  for (const file of files) {
    process.stdout.write(`  ✓ ${file}`);
    const raw = await readPhoto(path.join(PHOTOS_DIR, file));
    const { iv, data } = await encryptBuf(fullKey, raw);
    chunks.push(makeEntry(file, iv, data));
    process.stdout.write('\n');
  }

  /* Encrypt voice clips with full key — raw bytes, no processing */
  if (fs.existsSync(VOICES_DIR)) {
    const vexts  = /\.(m4a|mp3|ogg|wav|aac)$/i;
    const vfiles = fs.readdirSync(VOICES_DIR).filter(f => vexts.test(f));
    if (vfiles.length) {
      console.log(`\nEncrypting ${vfiles.length} voice clips...`);
      for (const file of vfiles) {
        const raw = fs.readFileSync(path.join(VOICES_DIR, file));
        const { iv, data } = await encryptBuf(fullKey, raw);
        chunks.push(makeEntry(file, iv, data));
        console.log(`  ✓ ${file} (${(raw.length/1024).toFixed(1)} KB)`);
      }
    }
  }

  /* Encrypt script.js with full key */
  if (!fs.existsSync('./script.js')) { console.error('script.js not found.'); process.exit(1); }
  console.log('\nEncrypting script.js...');
  const { iv: sIv, data: sData } = await encryptBuf(fullKey, Buffer.from(fs.readFileSync('./script.js', 'utf8'), 'utf8'));
  chunks.push(makeEntry('script.js', sIv, sData));
  console.log('  ✓ script.js');

  const bin = Buffer.concat(chunks);
  fs.writeFileSync(OUTPUT_BIN, bin);
  console.log(`\nDone → ${OUTPUT_BIN} (${(bin.length/1024/1024).toFixed(1)}MB)`);

  fs.writeFileSync(OUTPUT_FLAG, 'const _ENC=1;');
  console.log(`     → ${OUTPUT_FLAG} (flag only)`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
