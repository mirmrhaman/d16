import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { decryptText, encryptText, hashPassword, lookupHash, tokenHash, verifyPassword } from '../server/src/security.js';
import { createAuthService } from '../server/src/authService.js';
import { validateImageUpload } from '../server/src/uploadService.js';

process.env.APP_ENCRYPTION_KEY_BASE64 = randomBytes(32).toString('base64');
process.env.APP_HMAC_KEY_BASE64 = randomBytes(32).toString('base64');

test('envelope encryption is randomized, authenticated and bound to record/field', () => {
  const original = 'synthetic@example.invalid';
  const first = encryptText(original, 'users:one:email');
  assert.notDeepEqual(first, encryptText(original, 'users:one:email'));
  assert.equal(first.includes(Buffer.from(original)), false);
  assert.equal(decryptText(first, 'users:one:email'), original);
  assert.throws(() => decryptText(first, 'users:two:email'), { status: 503 });
  const changed = JSON.parse(first.toString());
  changed.value.data = randomBytes(32).toString('base64');
  assert.throws(() => decryptText(JSON.stringify(changed), 'users:one:email'), { status: 503 });
  assert.throws(() => decryptText(Buffer.from(original), 'users:one:email'), { status: 503 });
  assert.equal(encryptText(null), null);
  assert.equal(decryptText(null), null);
});

test('missing or reused encryption/lookup keys fail closed', () => {
  const lookup = process.env.APP_HMAC_KEY_BASE64;
  const alias = process.env.D16_LOOKUP_KEY;
  try {
    process.env.APP_HMAC_KEY_BASE64 = process.env.APP_ENCRYPTION_KEY_BASE64;
    assert.throws(() => encryptText('value'), { status: 503 });
    delete process.env.APP_HMAC_KEY_BASE64;
    delete process.env.D16_LOOKUP_KEY;
    assert.throws(() => lookupHash('value'), { status: 503 });
  } finally {
    process.env.APP_HMAC_KEY_BASE64 = lookup;
    if (alias) process.env.D16_LOOKUP_KEY = alias;
  }
});

test('keyed lookup is deterministic and separate from unkeyed hashes', () => {
  assert.equal(lookupHash('synthetic@example.invalid'), lookupHash('synthetic@example.invalid'));
  assert.notEqual(lookupHash('synthetic@example.invalid'), tokenHash('synthetic@example.invalid'));
  assert.notEqual(lookupHash('one'), lookupHash('two'));
});

test('scrypt rejects incorrect, plaintext, and unsafe-cost hashes', async () => {
  const password = randomBytes(20).toString('base64');
  const hash = await hashPassword(password);
  assert.equal(hash.includes(password), false);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword(`${password}!`, hash), false);
  assert.equal(await verifyPassword(password, password), false);
  assert.equal(await verifyPassword(password, hash.replace('$131072$', '$999999999$')), false);
  await assert.rejects(hashPassword('short'), { status: 400 });
});

function authFixture({ mfa = false, enabled = true, invalidPassword = false, missing = false } = {}) {
  const id = '00000000-0000-4000-8000-000000000011';
  const row = { id, email_ciphertext: encryptText('synthetic@example.invalid', `users:${id}:email`),
    phone_ciphertext: null, display_name: 'Synthetic QA', is_verified: 1, is_active: enabled ? 1 : 0,
    deleted_at: null, password_hash: 'test-hash' };
  const operations = [];
  let revoked = false;
  let permission = 'content.write';
  const connection = {
    beginTransaction: async () => operations.push(['begin']), commit: async () => operations.push(['commit']),
    rollback: async () => operations.push(['rollback']), release: () => operations.push(['release']),
    execute: async (sql, params = []) => {
      operations.push([sql, params]);
      if (sql.includes('FROM auth_sessions s')) {
        assert.match(sql, /s\.revoked_at IS NULL/);
        assert.match(sql, /s\.expires_at > UTC_TIMESTAMP\(\)/);
        assert.match(sql, /u\.is_active = 1 AND u\.is_verified = 1 AND u\.deleted_at IS NULL/);
        return [[...(revoked || !enabled ? [] : [row])]];
      }
      if (sql.includes('FROM users WHERE email_hash')) return [missing ? [] : [row]];
      if (sql.includes('FROM mfa_methods')) return [mfa ? [{ id: 'mfa-id' }] : []];
      if (sql.includes('SELECT DISTINCT r.role_key')) return [[{ role_key: 'super', permission_key: permission }]];
      if (sql.startsWith('UPDATE auth_sessions')) revoked = true;
      return [{ affectedRows: 1 }];
    },
  };
  const service = createAuthService({ pool: { ...connection, getConnection: async () => connection },
    passwordVerifier: async () => !invalidPassword, passwordHasher: async () => 'dummy-test-hash' });
  return { service, operations, setPermission: (value) => { permission = value; } };
}

test('login stores session hash, audits transactionally and exposes safe fields', async () => {
  const { service, operations } = authFixture();
  const result = await service.login({ email: 'Synthetic@example.invalid', password: 'fixture only' }, { ipAddress: '127.0.0.1' });
  const inserted = operations.find(([sql]) => sql.startsWith('INSERT INTO auth_sessions'));
  assert.equal(inserted[1][2], tokenHash(result.token));
  assert.equal(JSON.stringify(operations).includes(result.token), false);
  assert.equal(result.user.email, 'synthetic@example.invalid');
  assert.equal('password_hash' in result.user, false);
  assert.equal('email_ciphertext' in result.user, false);
  assert.ok(operations.find(([sql]) => sql.startsWith('INSERT INTO audit_logs')));
  assert.ok(operations.find(([sql]) => sql === 'commit'));
});

test('invalid credentials, disabled users and MFA do not issue sessions', async () => {
  for (const [options, status] of [[{ invalidPassword: true }, 401], [{ enabled: false }, 401], [{ missing: true }, 401], [{ mfa: true }, 503]]) {
    const { service, operations } = authFixture(options);
    await assert.rejects(service.login({ email: 'synthetic@example.invalid', password: 'fixture only' }), { status });
    assert.equal(operations.some(([sql]) => sql.startsWith('INSERT INTO auth_sessions')), false);
    assert.ok(operations.some(([sql]) => sql === 'rollback'));
  }
});

test('session permissions reload and logout revokes the session', async () => {
  const { service, setPermission } = authFixture();
  const { token } = await service.login({ email: 'synthetic@example.invalid', password: 'fixture only' });
  assert.deepEqual((await service.getSession(token)).permissions, ['content.write']);
  setPermission('content.read');
  assert.deepEqual((await service.getSession(token)).permissions, ['content.read']);
  await service.logout(token);
  assert.equal(await service.getSession(token), null);
  assert.equal(await service.getSession('forged-admin'), null);
});

test('uploads reject SVG/script and declared MIME mismatches', () => {
  const script = Buffer.from('<svg onload="alert(1)"></svg>').toString('base64');
  assert.throws(() => validateImageUpload({ data_base64: script, content_type: 'image/png' }), { status: 400 });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  assert.equal(validateImageUpload({ data_base64: png.toString('base64'), content_type: 'image/png' }).extension, 'png');
  assert.throws(() => validateImageUpload({ data_base64: png.toString('base64'), content_type: 'image/jpeg' }), { status: 400 });
});
