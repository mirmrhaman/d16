import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const SCRYPT_N = 131072;
const scryptOptions = { N: SCRYPT_N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function readKey(primary, alias) {
  const text = process.env[primary] || process.env[alias];
  const key = text && /^[A-Za-z0-9+/]+={0,2}$/.test(text) ? Buffer.from(text, 'base64') : null;
  if (!key || key.length !== 32 || key.toString('base64') !== text) {
    throw httpError(503, `Configure ${primary} as a base64 encoded 32-byte key.`);
  }
  return key;
}

export function validateSecurityConfig() {
  const encryption = readKey('APP_ENCRYPTION_KEY_BASE64', 'D16_ENCRYPTION_KEY');
  const lookup = readKey('APP_HMAC_KEY_BASE64', 'D16_LOOKUP_KEY');
  if (timingSafeEqual(encryption, lookup)) throw httpError(503, 'Encryption and lookup keys must be different.');
  return { encryption, lookup };
}

const b64 = (bytes) => bytes.toString('base64');
function seal(key, data, aad) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  return { iv: b64(iv), data: b64(Buffer.concat([cipher.update(data), cipher.final()])), tag: b64(cipher.getAuthTag()) };
}
function unseal(key, envelope, aad) {
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted value');
  const cipher = createDecipheriv('aes-256-gcm', key, iv);
  cipher.setAuthTag(tag);
  cipher.setAAD(Buffer.from(aad));
  return Buffer.concat([cipher.update(Buffer.from(envelope.data, 'base64')), cipher.final()]);
}

// Each value has its own data key, wrapped by the server's master key.
// Context binds ciphertext to its entity, record and field to prevent swapping.
export function encryptText(value, context = '') {
  if (value === null || value === undefined) return null;
  const { encryption } = validateSecurityConfig();
  const dataKey = randomBytes(32);
  try {
    return Buffer.from(JSON.stringify({
      v: 1, alg: 'A256GCM',
      wrapped: seal(encryption, dataKey, `d16:v1:key:${context}`),
      value: seal(dataKey, Buffer.from(String(value), 'utf8'), `d16:v1:value:${context}`),
    }));
  } finally { dataKey.fill(0); }
}

export function decryptText(value, context = '') {
  if (value === null || value === undefined) return null;
  const { encryption } = validateSecurityConfig();
  try {
    const envelope = JSON.parse(Buffer.isBuffer(value) ? value.toString('utf8') : String(value));
    if (envelope.v !== 1 || envelope.alg !== 'A256GCM') throw new Error('Unsupported encryption envelope');
    const dataKey = unseal(encryption, envelope.wrapped, `d16:v1:key:${context}`);
    try { return unseal(dataKey, envelope.value, `d16:v1:value:${context}`).toString('utf8'); }
    finally { dataKey.fill(0); }
  } catch {
    throw httpError(503, 'Encrypted data could not be read. Check the encryption key and migrate any legacy plaintext data.');
  }
}

export function lookupHash(value) {
  if (value === null || value === undefined || value === '') return null;
  return createHmac('sha256', validateSecurityConfig().lookup).update(String(value)).digest('hex');
}
export const tokenHash = (value) => createHash('sha256').update(value).digest('hex');

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 1024) {
    throw httpError(400, 'Use a password with at least 12 characters and at most 1024 bytes.');
  }
  const salt = randomBytes(16);
  const hash = await derive(password, salt, 64, scryptOptions);
  return `scrypt$${SCRYPT_N}$8$1$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || Buffer.byteLength(password) > 1024) return false;
  const [algorithm, n, r, p, salt64, hash64, extra] = String(stored || '').split('$');
  if (algorithm !== 'scrypt' || n !== String(SCRYPT_N) || r !== '8' || p !== '1' || extra !== undefined) return false;
  const salt = Buffer.from(salt64 || '', 'base64');
  const expected = Buffer.from(hash64 || '', 'base64');
  if (salt.length !== 16 || expected.length !== 64) return false;
  const actual = await derive(password, salt, 64, scryptOptions);
  return timingSafeEqual(actual, expected);
}
