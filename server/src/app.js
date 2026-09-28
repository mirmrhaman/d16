import express from 'express';
import path from 'node:path';
import { createAuthService, SECTION_PERMISSIONS } from './authService.js';
import { httpError, lookupHash, validateSecurityConfig } from './security.js';

const COOKIE = 'd16_session';
const asyncRoute = (callback) => (req, res, next) => Promise.resolve(callback(req, res, next)).catch(next);
const actorFor = (req) => ({ userId: req.user?.id || null, ipAddress: req.ip, userAgent: req.get('user-agent') || '' });
const cookieToken = (req) => {
  const match = String(req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  return match ? match.slice(COOKIE.length + 1) : null;
};
const routes = [
  ['hero-slides', 'HeroSlide', 'content.write'], ['stats', 'Stats', 'content.write'],
  ['services', 'Service', 'content.write'], ['projects', 'Project', 'content.write'],
  ['blog-posts', 'BlogPost', 'content.write'], ['consultations', 'Consultation', 'consultations.write'],
  ['contact-info', 'ContactInfo', 'branding.write'], ['gallery-videos', 'GalleryVideo', 'content.write'],
  ['gallery-concepts', 'GalleryConcept', 'content.write'], ['pic-your-concept', 'PicYourConcept', 'content.write'],
  ['about-page', 'AboutPage', 'content.write'],
  ['dashboard-layout', 'DashboardLayout', 'branding.write'], ['website-icons', 'WebsiteIcons', 'branding.write'],
  ['navigation-menu', 'NavigationMenu', 'branding.write'],
];
const adminOnlyWrites = new Set(['DashboardLayout', 'WebsiteIcons', 'NavigationMenu']);
const entitySections = { HeroSlide: 'HeroSlides', Stats: 'Stats', Service: 'Services', Project: 'Projects', BlogPost: 'Blog', GalleryVideo: 'Gallery', GalleryConcept: 'Gallery', PicYourConcept: 'PicYourConcept', AboutPage: 'About' };
const unavailableCodes = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH', 'ER_ACCESS_DENIED_ERROR', 'ER_NO_SUCH_TABLE']);

export function createApp({ pool, content, auth = createAuthService({ pool }), upload, allowedOrigins, secureCookies = process.env.NODE_ENV === 'production' || process.env.D16_SECURE_COOKIES === 'true' }) {
  const app = express();
  app.disable('x-powered-by');
  const origins = new Set(allowedOrigins || (process.env.D16_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8787,http://127.0.0.1:8787').split(',').map((value) => value.trim()).filter(Boolean));
  for (const origin of origins) {
    if (new URL(origin).origin !== origin) throw new Error('D16_ALLOWED_ORIGINS must contain complete origins without paths.');
  }
  const cookieOptions = { httpOnly: true, secure: secureCookies, sameSite: 'strict', path: '/api', maxAge: 8 * 60 * 60 * 1000 };
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (origin && !origins.has(origin)) return res.status(403).json({ error: 'Request origin is not allowed.' });
    if (origin) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Credentials', 'true');
      res.vary('Origin');
    }
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type,X-D16-Request');
      return res.status(204).end();
    }
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (!origin) return res.status(403).json({ error: 'A configured Origin header is required for changes.' });
      if (!req.is('application/json')) return res.status(415).json({ error: 'Changes require application/json.' });
      if (secureCookies && origin.startsWith('http:')) return res.status(403).json({ error: 'HTTPS is required for this environment.' });
    }
    next();
  });
  app.use(express.json({ limit: '7mb', strict: true }));
  app.use((req, res, next) => {
    if (req.body && (Array.isArray(req.body) || typeof req.body !== 'object')) return res.status(400).json({ error: 'Expected a JSON object.' });
    next();
  });

  const authenticate = asyncRoute(async (req, _res, next) => {
    req.user = await auth.getSession(cookieToken(req));
    if (!req.user) throw httpError(401, 'Please sign in.');
    next();
  });
  const permit = (permission, entity) => (req, _res, next) => {
    if (!req.user?.permissions?.includes(permission)) return next(httpError(403, 'Your account does not have permission for this action.'));
    if (adminOnlyWrites.has(entity) && req.user.role !== 'admin') return next(httpError(403, 'Only administrators can change this configuration.'));
    const section = entitySections[entity];
    if (section && req.user.role !== 'admin' && !req.user.permissions.includes(SECTION_PERMISSIONS[section])) return next(httpError(403, 'Your account does not have access to this content section.'));
    next();
  };

  // Single-instance QA limiter. Production needs a shared rate-limit store.
  const limits = new Map();
  function rateLimit(key, maximum, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    for (const [entryKey, entry] of limits) if (entry.until <= now) limits.delete(entryKey);
    const entry = limits.get(key) || { count: 0, until: now + windowMs };
    if (entry.count >= maximum || limits.size >= 10000 && !limits.has(key)) throw httpError(429, 'Too many attempts. Try again later.');
    entry.count += 1;
    limits.set(key, entry);
  }

  app.get('/api/health', asyncRoute(async (_req, res) => {
    try {
      validateSecurityConfig();
      await pool.execute('SELECT 1');
      res.json({ ok: true, service: 'd16-api', database: 'connected', mode: 'database' });
    } catch {
      res.status(503).json({ ok: false, service: 'd16-api', database: 'unavailable', mode: 'database', error: 'Database or security configuration is unavailable.' });
    }
  }));
  app.post('/api/auth/login', asyncRoute(async (req, res) => {
    rateLimit(`login-ip:${req.ip}`, 30);
    rateLimit(`login-account:${lookupHash(String(req.body.email || '').trim().toLowerCase())}`, 10);
    const result = await auth.login(req.body, actorFor(req));
    res.cookie(COOKIE, result.token, { ...cookieOptions, expires: result.expiresAt });
    res.json({ user: result.user });
  }));
  app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));
  app.post('/api/auth/logout', asyncRoute(async (req, res) => {
    const token = cookieToken(req);
    req.user = await auth.getSession(token);
    await auth.logout(token, actorFor(req));
    res.clearCookie(COOKIE, { httpOnly: true, secure: secureCookies, sameSite: 'strict', path: '/api' });
    res.status(204).end();
  }));

  app.get('/api/users', authenticate, permit('users.manage'), asyncRoute(async (_req, res) => res.json(await auth.listUsers())));
  app.post('/api/users', authenticate, permit('users.manage'), asyncRoute(async (req, res) => res.status(201).json(await auth.createUser(req.body, actorFor(req)))));
  app.put('/api/users/:id', authenticate, permit('users.manage'), asyncRoute(async (req, res) => res.json(await auth.updateUser(req.params.id, req.body, actorFor(req)))));
  app.delete('/api/users/:id', authenticate, permit('users.manage'), asyncRoute(async (req, res) => {
    await auth.updateUser(req.params.id, { is_active: false }, actorFor(req));
    res.status(204).end();
  }));
  app.get('/api/audit-logs', authenticate, permit('users.manage'), asyncRoute(async (req, res) => res.json(await auth.listAuditLogs(req.query))));
  app.get('/api/access-control', authenticate, asyncRoute(async (_req, res) => res.json(await auth.listAccessControl())));
  app.put('/api/access-control/:id', authenticate, permit('users.manage'), asyncRoute(async (req, res) => res.json(await auth.updateAccessControl(req.params.id, req.body, actorFor(req)))));

  for (const [endpoint, entity, permission] of routes) {
    app.get(`/api/${endpoint}`, asyncRoute(async (req, res) => {
      const adminRead = req.query.admin === '1';
      if (entity === 'Consultation' || entity === 'DashboardLayout' || adminRead) {
        req.user = await auth.getSession(cookieToken(req));
        if (!req.user) throw httpError(401, 'Please sign in.');
        if (entity === 'DashboardLayout' && req.user.role !== 'admin') throw httpError(403, 'Only administrators can read the dashboard layout.');
        const readPermission = entity === 'Consultation' ? 'consultations.read' : 'content.read';
        if (!req.user.permissions.includes(readPermission)) throw httpError(403, 'Your account cannot read this content.');
      }
      let rows = await content.listContent(entity);
      if (!adminRead && entity === 'HeroSlide') rows = rows.filter((row) => row.active !== false && row.active !== 0 && row.is_active !== false && row.is_active !== 0);
      if (!adminRead && entity === 'BlogPost') rows = rows.filter((row) => {
        if (row.published === false || row.published === 0) return false;
        const published = row.published_date || row.published_at;
        return published && Number.isFinite(Date.parse(published)) && Date.parse(published) <= Date.now();
      });
      res.json(rows);
    }));
    if (entity === 'Consultation') {
      app.post(`/api/${endpoint}`, asyncRoute(async (req, res) => {
        rateLimit(`consultation:${req.ip}`, 5, 60 * 60 * 1000);
        const keys = ['full_name', 'email', 'phone', 'project_type', 'location', 'budget', 'message', 'preferred_date'];
        const payload = Object.fromEntries(keys.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
        payload.status = 'pending';
        const created = await content.createContent(entity, payload, actorFor(req));
        res.status(201).json({ id: created.id, status: 'pending', submitted: true });
      }));
    } else {
      app.post(`/api/${endpoint}`, authenticate, permit(permission, entity), asyncRoute(async (req, res) => res.status(201).json(await content.createContent(entity, req.body, actorFor(req)))));
    }
    app.put(`/api/${endpoint}/:id`, authenticate, permit(permission, entity), asyncRoute(async (req, res) => res.json(await content.updateContent(entity, req.params.id, req.body, actorFor(req)))));
    app.delete(`/api/${endpoint}/:id`, authenticate, permit(permission, entity), asyncRoute(async (req, res) => {
      const removed = await content.deleteContent(entity, req.params.id, actorFor(req));
      if (!removed) throw httpError(404, 'Record not found.');
      res.status(204).end();
    }));
  }
  app.post('/api/uploads', authenticate, permit('content.write'), asyncRoute(async (req, res) => {
    rateLimit(`upload:${req.user.id}`, 30);
    if (!upload) throw httpError(503, 'Persistent uploads are not configured.');
    res.status(201).json(await upload(req.body, actorFor(req)));
  }));
  if (process.env.D16_UPLOAD_DIR && path.isAbsolute(process.env.D16_UPLOAD_DIR)) {
    app.use('/uploads', express.static(process.env.D16_UPLOAD_DIR, { dotfiles: 'deny', index: false,
      setHeaders: (res) => { res.set('Content-Security-Policy', "default-src 'none'; sandbox"); res.set('X-Content-Type-Options', 'nosniff'); },
    }));
  }
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || (unavailableCodes.has(error.code) ? 503 : 500);
    if (status >= 500) console.error(`[d16-api] request failed (${error.code || error.name || 'Error'})`);
    res.status(status).json({ error: status === 500 ? 'The request could not be completed.' : error.expose === false ? 'Invalid request.' : error.status ? error.message : 'Database unavailable. No changes were saved locally.' });
  });
  return app;
}
