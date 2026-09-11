import { randomBytes, randomUUID } from 'node:crypto';
import { decryptText, encryptText, hashPassword, httpError, lookupHash, tokenHash, verifyPassword } from './security.js';

const MFA_UNAVAILABLE = 'MFA is enabled for this account. A real email/SMS or TOTP verification provider must be integrated before signing in; demo OTPs are not accepted.';
const ROLE_KEYS = new Set(['admin', 'super', 'viewer']);
export const SECTION_PERMISSIONS = {
  HeroSlides: 'section.hero_slides.write', Stats: 'section.stats.write', Services: 'section.services.write',
  Projects: 'section.projects.write', Blog: 'section.blog_posts.write', Gallery: 'section.gallery.write',
  PicYourConcept: 'section.pic_your_concept.write',
  About: 'section.about.write',
};
const emailValue = (value) => {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Enter a valid email address.');
  return email;
};
const phoneValue = (value) => String(value || '').trim().replace(/[\s()-]/g, '');
const bool = (value) => value === true || value === 1;

async function audit(connection, actor, action, entityId, changedFields = [], entityName = 'users') {
  await connection.execute(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_name, entity_id, new_data, ip_address, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [randomUUID(), actor?.userId || null, action, entityName, entityId, JSON.stringify({ changed_fields: changedFields }),
      actor?.ipAddress || null, String(actor?.userAgent || '').slice(0, 512) || null],
  );
}

export function createAuthService({ pool, passwordVerifier = verifyPassword, passwordHasher = hashPassword }) {
  let dummyHash;
  async function verifyUnknown(password) {
    dummyHash ||= passwordHasher(randomBytes(32).toString('base64'));
    await passwordVerifier(password, await dummyHash);
  }
  async function transaction(callback) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const value = await callback(connection);
      await connection.commit();
      return value;
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') throw httpError(409, 'A user with that email already exists.');
      throw error;
    } finally { connection.release(); }
  }
  async function permissionsFor(connection, userId) {
    const [rows] = await connection.execute(
      `SELECT DISTINCT r.role_key, p.permission_key
       FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id WHERE ura.user_id = ?`, [userId],
    );
    const roles = [...new Set(rows.map((row) => row.role_key))];
    return { roles, role: ['admin', 'super', 'viewer'].find((role) => roles.includes(role)) || 'viewer',
      permissions: [...new Set(rows.map((row) => row.permission_key).filter(Boolean))] };
  }
  async function safeUser(connection, row) {
    const [methods] = await connection.execute('SELECT id FROM mfa_methods WHERE user_id = ? AND is_enabled = 1 LIMIT 1', [row.id]);
    return {
      id: row.id, email: decryptText(row.email_ciphertext, `users:${row.id}:email`),
      phone: decryptText(row.phone_ciphertext, `users:${row.id}:phone`) || '', name: row.display_name || '',
      verified: bool(row.is_verified), is_active: bool(row.is_active), two_factor_enabled: methods.length > 0,
      ...(await permissionsFor(connection, row.id)),
    };
  }
  const userFields = 'id, email_ciphertext, phone_ciphertext, display_name, is_verified, is_active, deleted_at';

  async function login(payload, actor = {}) {
    const email = emailValue(payload.email);
    const password = typeof payload.password === 'string' ? payload.password : '';
    return transaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT ${userFields}, password_hash FROM users WHERE email_hash = ? LIMIT 1 FOR UPDATE`, [lookupHash(email)],
      );
      const row = rows[0];
      if (!row) {
        await verifyUnknown(password);
        throw httpError(401, 'Invalid email or password.');
      }
      const valid = await passwordVerifier(password, row.password_hash);
      if (!valid || !bool(row.is_verified) || !bool(row.is_active) || row.deleted_at) throw httpError(401, 'Invalid email or password.');
      const user = await safeUser(connection, row);
      if (user.two_factor_enabled) throw httpError(503, MFA_UNAVAILABLE);
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
      await connection.execute(
        `INSERT INTO auth_sessions (id, user_id, session_token_hash, expires_at, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [randomUUID(), row.id, tokenHash(token), expiresAt, actor.ipAddress || null, String(actor.userAgent || '').slice(0, 512) || null],
      );
      await audit(connection, { ...actor, userId: row.id }, 'auth.login', row.id);
      return { token, expiresAt, user };
    });
  }

  async function getSession(token) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const [rows] = await pool.execute(
      `SELECT u.id, u.email_ciphertext, u.phone_ciphertext, u.display_name, u.is_verified, u.is_active, u.deleted_at
       FROM auth_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.session_token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP()
       AND u.is_active = 1 AND u.is_verified = 1 AND u.deleted_at IS NULL LIMIT 1`, [tokenHash(token)],
    );
    if (!rows[0]) return null;
    const user = await safeUser(pool, rows[0]);
    return user.two_factor_enabled ? null : user;
  }

  async function logout(token, actor = {}) {
    if (!token) return;
    await transaction(async (connection) => {
      await connection.execute('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP() WHERE session_token_hash = ? AND revoked_at IS NULL', [tokenHash(token)]);
      if (actor.userId) await audit(connection, actor, 'auth.logout', actor.userId);
    });
  }

  async function listUsers() {
    const [rows] = await pool.execute(`SELECT ${userFields} FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`);
    return Promise.all(rows.map((row) => safeUser(pool, row)));
  }

  async function insertUser(connection, payload, actor) {
    const id = randomUUID();
    const email = emailValue(payload.email);
    const phone = phoneValue(payload.phone);
    const role = payload.role || 'viewer';
    if (!ROLE_KEYS.has(role)) throw httpError(400, 'Unknown role.');
    if (payload.two_factor_enabled) throw httpError(503, MFA_UNAVAILABLE);
    if (phone.length > 32 || String(payload.name || '').length > 255) throw httpError(400, 'Name or phone is too long.');
    const hash = await passwordHasher(payload.password);
    const [roles] = await connection.execute('SELECT id FROM roles WHERE role_key = ? LIMIT 1', [role]);
    if (!roles[0]) throw httpError(503, 'Initialize the baseline database roles first.');
    await connection.execute(
      `INSERT INTO users (id, email_ciphertext, phone_ciphertext, email_hash, phone_hash, display_name, password_hash, is_verified, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, encryptText(email, `users:${id}:email`), encryptText(phone || null, `users:${id}:phone`), lookupHash(email), lookupHash(phone),
        String(payload.name || '').trim() || null, hash, bool(payload.verified) ? 1 : 0],
    );
    await connection.execute('INSERT INTO user_role_assignments (id, user_id, role_id, assigned_by_user_id) VALUES (?, ?, ?, ?)',
      [randomUUID(), id, roles[0].id, actor?.userId || null]);
    await audit(connection, actor, 'users.create', id, ['email', 'phone', 'name', 'password', 'role', 'verified']);
    const [rows] = await connection.execute(`SELECT ${userFields} FROM users WHERE id = ?`, [id]);
    return safeUser(connection, rows[0]);
  }

  async function createUser(payload, actor) {
    return transaction((connection) => insertUser(connection, payload, actor));
  }

  // Provisioning utility, deliberately never exposed as an HTTP route.
  async function bootstrapAdmin(payload) {
    return transaction(async (connection) => {
      const [roles] = await connection.execute("SELECT id FROM roles WHERE role_key = 'admin' FOR UPDATE");
      if (!roles[0]) throw httpError(503, 'Initialize baseline roles first.');
      const [admins] = await connection.execute('SELECT user_id FROM user_role_assignments WHERE role_id = ? LIMIT 1', [roles[0].id]);
      if (admins.length) throw httpError(409, 'An administrator already exists; sign in to manage users.');
      return insertUser(connection, { ...payload, role: 'admin', verified: true }, null);
    });
  }

  async function updateUser(id, payload, actor) {
    return transaction(async (connection) => {
      // Serialize demotions so concurrent changes cannot remove all administrators.
      const [adminRoles] = await connection.execute("SELECT id FROM roles WHERE role_key = 'admin' FOR UPDATE");
      const [rows] = await connection.execute(`SELECT ${userFields} FROM users WHERE id = ? AND deleted_at IS NULL FOR UPDATE`, [id]);
      if (!rows[0]) throw httpError(404, 'User not found.');
      const current = await safeUser(connection, rows[0]);
      const next = { ...current, ...Object.fromEntries(['email', 'phone', 'name', 'role', 'verified', 'is_active'].filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]])) };
      next.email = emailValue(next.email);
      next.phone = phoneValue(next.phone);
      if (!ROLE_KEYS.has(next.role)) throw httpError(400, 'Unknown role.');
      if (String(next.name).length > 255 || next.phone.length > 32) throw httpError(400, 'Name or phone is too long.');
      if (payload.two_factor_enabled !== undefined && bool(payload.two_factor_enabled) !== current.two_factor_enabled) throw httpError(503, MFA_UNAVAILABLE);
      if (current.roles.includes('admin') && (next.role !== 'admin' || !bool(next.verified) || !bool(next.is_active))) {
        const [admins] = await connection.execute(
          'SELECT u.id FROM users u JOIN user_role_assignments ura ON ura.user_id = u.id WHERE ura.role_id = ? AND u.is_active = 1 AND u.is_verified = 1 AND u.deleted_at IS NULL AND u.id <> ?',
          [adminRoles[0]?.id || '', id],
        );
        if (!admins.length) throw httpError(409, 'Keep at least one active, verified administrator.');
      }
      const changed = ['email', 'phone', 'name', 'role', 'verified', 'is_active'].filter((key) => next[key] !== current[key]);
      await connection.execute(
        'UPDATE users SET email_ciphertext = ?, phone_ciphertext = ?, email_hash = ?, phone_hash = ?, display_name = ?, is_verified = ?, is_active = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
        [encryptText(next.email, `users:${id}:email`), encryptText(next.phone || null, `users:${id}:phone`), lookupHash(next.email), lookupHash(next.phone), String(next.name || ''), bool(next.verified) ? 1 : 0, bool(next.is_active) ? 1 : 0, id],
      );
      if (next.role !== current.role) {
        const [roles] = await connection.execute('SELECT id FROM roles WHERE role_key = ? LIMIT 1', [next.role]);
        if (!roles[0]) throw httpError(400, 'Unknown role.');
        await connection.execute('DELETE FROM user_role_assignments WHERE user_id = ?', [id]);
        await connection.execute('INSERT INTO user_role_assignments (id, user_id, role_id, assigned_by_user_id) VALUES (?, ?, ?, ?)', [randomUUID(), id, roles[0].id, actor.userId]);
      }
      if (payload.password !== undefined && payload.password !== '') {
        await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [await passwordHasher(payload.password), id]);
        changed.push('password');
      }
      if (changed.length) {
        await connection.execute('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL', [id]);
        await audit(connection, actor, 'users.update', id, changed);
      }
      const [updated] = await connection.execute(`SELECT ${userFields} FROM users WHERE id = ?`, [id]);
      return safeUser(connection, updated[0]);
    });
  }

  async function listAuditLogs({ limit = 100, before } = {}) {
    const count = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 100));
    if (before && Number.isNaN(Date.parse(before))) throw httpError(400, 'Invalid audit cursor date.');
    const params = before ? [new Date(before)] : [];
    const [rows] = await pool.execute(
      `SELECT id, actor_user_id, action, entity_name, entity_id, old_data, new_data, ip_address, user_agent, created_at
       FROM audit_logs ${before ? 'WHERE created_at < ?' : ''} ORDER BY created_at DESC, id DESC LIMIT ${count}`, params,
    );
    return rows.map((row) => ({ ...row, old_data: safeAuditData(row.old_data), new_data: safeAuditData(row.new_data) }));
  }
  async function listAccessControl(connection = pool) {
    const [rows] = await connection.execute(
      `SELECT p.permission_key FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id WHERE r.role_key = 'super'`,
    );
    const keys = new Set(rows.map((row) => row.permission_key));
    return [{ id: 'super', allowed_sections: Object.keys(SECTION_PERMISSIONS).filter((section) => keys.has(SECTION_PERMISSIONS[section])) }];
  }
  async function updateAccessControl(id, payload, actor) {
    if (id !== 'super') throw httpError(404, 'Role configuration not found.');
    const allowed = payload.allowed_sections;
    if (!Array.isArray(allowed) || allowed.some((section) => !Object.hasOwn(SECTION_PERMISSIONS, section))) throw httpError(400, 'Unknown content section.');
    return transaction(async (connection) => {
      const [roles] = await connection.execute("SELECT id FROM roles WHERE role_key = 'super' FOR UPDATE");
      if (!roles[0]) throw httpError(503, 'Initialize the baseline database roles first.');
      const [permissions] = await connection.execute("SELECT id, permission_key FROM permissions WHERE permission_key LIKE 'section.%'");
      const available = new Map(permissions.map((row) => [row.permission_key, row.id]));
      if (Object.values(SECTION_PERMISSIONS).some((key) => !available.has(key))) throw httpError(503, 'Apply the section-permissions migration first.');
      const permissionIds = Object.values(SECTION_PERMISSIONS).map((key) => available.get(key));
      await connection.execute(`DELETE FROM role_permissions WHERE role_id = ? AND permission_id IN (${permissionIds.map(() => '?').join(',')})`, [roles[0].id, ...permissionIds]);
      for (const section of new Set(allowed)) {
        await connection.execute('INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)', [randomUUID(), roles[0].id, available.get(SECTION_PERMISSIONS[section])]);
      }
      await audit(connection, actor, 'permissions.update', roles[0].id, ['allowed_sections'], 'roles');
      return (await listAccessControl(connection))[0];
    });
  }
  return { login, getSession, logout, listUsers, createUser, updateUser, bootstrapAdmin, listAuditLogs, listAccessControl, updateAccessControl };
}

function safeAuditData(value) {
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    if (!data || typeof data !== 'object') return null;
    // Legacy full snapshots may contain PII; expose only the metadata contract.
    return { changed_fields: Array.isArray(data.changed_fields) ? data.changed_fields.filter((key) => typeof key === 'string').slice(0, 100) : [] };
  } catch { return null; }
}
