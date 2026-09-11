/*
 * Encrypts source/site_data.json into data.enc, so the published site carries ciphertext
 * instead of nine couriers' names, phone numbers and balances in plain text.
 *
 *   node build.js
 *
 * Reads the access key from source/KEY.txt. Neither source/ file is committed - see .gitignore.
 * The parameters below must stay in step with the decrypt side in app.js.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ITERATIONS = 250000;
const HASH = 'sha256';
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const here = (f) => path.join(__dirname, f);

const key = fs.readFileSync(here('source/KEY.txt'), 'utf8').trim();
if (!key) {
  console.error('source/KEY.txt is empty - nothing to encrypt with.');
  process.exit(1);
}

const plaintext = fs.readFileSync(here('source/site_data.json'), 'utf8');
JSON.parse(plaintext); // fail loudly here rather than in the browser

const salt = crypto.randomBytes(SALT_BYTES);
const iv = crypto.randomBytes(IV_BYTES);
const derived = crypto.pbkdf2Sync(key, salt, ITERATIONS, KEY_BYTES, HASH);

const cipher = crypto.createCipheriv('aes-256-gcm', derived, iv);
const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();

/* salt | iv | ciphertext+tag - the browser splits it back apart by these fixed lengths */
const payload = Buffer.concat([salt, iv, body, tag]).toString('base64');
fs.writeFileSync(here('data.enc'), payload);

const plain = here('data.js');
if (fs.existsSync(plain)) {
  fs.unlinkSync(plain);
  console.log('removed the plaintext data.js');
}

console.log('wrote data.enc  ' + payload.length + ' base64 chars  from ' + plaintext.length + ' chars of JSON');
console.log('pbkdf2-' + HASH + ' x' + ITERATIONS + ', aes-256-gcm');
