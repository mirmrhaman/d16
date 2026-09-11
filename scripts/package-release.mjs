import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, mkdtemp, open, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_DIRECTORIES = ['dist', 'server/src', 'database/migrations'];
const SOURCE_FILES = ['package.json', 'package-lock.json', 'database/schema.mysql.sql'];
const STATIC_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.txt', '.xml', '.webmanifest', '.wasm', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.webm']);
const EXCLUDED_DIRECTORIES = new Set(['node_modules', 'uploads', 'backups', 'backup', 'dumps', 'secrets', 'credentials', 'coverage']);
const hashBytes = (bytes) => createHash('sha256').update(bytes).digest('hex');
const within = (parent, child) => child === parent || child.startsWith(parent + path.sep);

export function validateReleaseIdentity(version, commit) {
  if (typeof version !== 'string' || version.length > 100 || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.test(version)) throw new Error('Version must be a safe semantic version such as 1.0.0-qa.123.1');
  const prerelease = version.split('+')[0].split('-').slice(1).join('-');
  if (prerelease.split('.').some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) throw new Error('Numeric prerelease identifiers cannot have leading zeros');
  if (typeof commit !== 'string' || !/^[0-9a-f]{40}$/i.test(commit)) throw new Error('Commit must be a full 40-character hexadecimal SHA');
  return { version, commit: commit.toLowerCase() };
}

function excluded(relative) {
  const segments = relative.split('/');
  if (segments.some((part) => part.startsWith('.') || EXCLUDED_DIRECTORIES.has(part.toLowerCase()))) return true;
  const name = segments.at(-1);
  return /(?:^|[._-])(?:env|credentials?|secrets?|dumps?|backups?|private[-_]?key)(?:[._-]|$)/i.test(name)
    || /\.(?:bak|backup|dump|sqlite3?|db|pem|key|p12|pfx|log|map|zip|tar|tgz|gz)$/i.test(name);
}

function allowedFile(relative) {
  if (excluded(relative)) return false;
  if (SOURCE_FILES.includes(relative)) return true;
  if (relative.startsWith('server/src/')) return relative.endsWith('.js');
  if (relative.startsWith('database/migrations/')) return /^database\/migrations\/\d{3}_[A-Za-z0-9_-]+\.sql$/.test(relative);
  if (relative.startsWith('dist/')) return STATIC_EXTENSIONS.has(path.extname(relative).toLowerCase()) || ['_redirects', '_headers'].includes(path.basename(relative));
  return false;
}

async function checkedPath(root, relative) {
  if (relative.includes('\\') || relative.split('/').some((part) => !part || part === '.' || part === '..' || [...part].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) throw new Error('Unsafe release input path');
  let cursor = root;
  for (const part of relative.split('/')) {
    cursor = path.join(cursor, part);
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed in release inputs: ${relative}`);
  }
  if (!within(root, await realpath(cursor))) throw new Error(`Release input escapes project: ${relative}`);
  return cursor;
}

async function readRegularFile(root, relative) {
  const absolute = await checkedPath(root, relative);
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error(`Release input must be a regular file: ${relative}`);
    return await handle.readFile();
  } finally { await handle.close(); }
}

// Only these explicit input trees are traversed; .env, dumps and uploads never
// become release files. Returned bytes are the exact snapshot hashed and staged.
export async function collectReleaseFiles(projectRoot = process.cwd()) {
  const root = await realpath(path.resolve(projectRoot));
  if (!(await lstat(root)).isDirectory()) throw new Error('Project root must be a directory');
  const files = [];
  const collect = async (relative) => {
    const absolute = await checkedPath(root, relative);
    const stat = await lstat(absolute);
    if (stat.isDirectory()) {
      if (excluded(relative)) return;
      for (const name of (await readdir(absolute)).sort()) await collect(`${relative}/${name}`);
    } else {
      if (!stat.isFile()) throw new Error(`Release input must be a regular file: ${relative}`);
      if (!allowedFile(relative)) return;
      const bytes = await readRegularFile(root, relative);
      files.push({ path: relative, size: bytes.length, sha256: hashBytes(bytes), bytes });
    }
  };
  for (const relative of SOURCE_FILES) {
    const bytes = await readRegularFile(root, relative);
    files.push({ path: relative, size: bytes.length, sha256: hashBytes(bytes), bytes });
  }
  for (const relative of SOURCE_DIRECTORIES) {
    const absolute = await checkedPath(root, relative);
    if (!(await lstat(absolute)).isDirectory()) throw new Error(`Required release directory is missing: ${relative}`);
    await collect(relative);
  }
  if (!files.some((file) => file.path === 'dist/index.html')) throw new Error('Build the frontend first: dist/index.html is required');
  if (!files.some((file) => file.path === 'server/src/index.js')) throw new Error('server/src/index.js is required');
  if (!files.some((file) => file.path.startsWith('database/migrations/'))) throw new Error('At least one numbered SQL migration is required');
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

async function prepareOutputDirectory(directory) {
  const parsed = path.parse(directory);
  let cursor = parsed.root;
  for (const part of directory.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    try {
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Output path must contain directories, never symlinks');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await mkdir(cursor, { mode: 0o700 });
    }
  }
}

export async function createReleasePackage({ version, commit, output = 'release-artifacts', projectRoot = process.cwd() }) {
  const identity = validateReleaseIdentity(version, commit);
  if (typeof output !== 'string' || !output.trim() || [...output].some((char) => char.charCodeAt(0) < 32)) throw new Error('Specify a valid output directory');
  const root = await realpath(path.resolve(projectRoot));
  const destination = path.resolve(root, output);
  if (destination === root || destination === path.parse(destination).root || SOURCE_DIRECTORIES.some((source) => within(path.join(root, source), destination))) throw new Error('Output must be a separate directory outside release input trees');
  // Resolve the existing system temporary directory before creating staging so
  // macOS /var or /tmp aliases do not become input/output symlinks themselves.
  await prepareOutputDirectory(destination);
  const basename = `d16-${identity.version}`;
  const archivePath = path.join(destination, `${basename}.tar.gz`);
  const manifestPath = path.join(destination, `${basename}.manifest.json`);
  for (const target of [archivePath, manifestPath]) {
    try { await lstat(target); throw new Error(`Release already exists; choose a new version: ${path.basename(target)}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const files = await collectReleaseFiles(root);
  const manifest = { schema_version: 1, application: 'D16', ...identity, built_at: new Date().toISOString(), files: files.map(({ path: name, size, sha256 }) => ({ path: name, size, sha256 })) };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  const temporary = await mkdtemp(path.join(await realpath(tmpdir()), 'd16-release-'));
  const createdOutputs = [];
  try {
    const staging = path.join(temporary, 'contents');
    await mkdir(staging, { mode: 0o700 });
    for (const file of files) {
      const target = path.join(staging, file.path);
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, file.bytes, { flag: 'wx', mode: 0o644 });
    }
    await writeFile(path.join(staging, 'release-manifest.json'), manifestBytes, { flag: 'wx', mode: 0o644 });
    const stagedArchive = path.join(temporary, `${basename}.tar.gz`);
    const result = spawnSync('tar', ['-czf', stagedArchive, '-C', staging, '.'], { encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new Error(`Release archive failed: ${result.error?.message || result.stderr.trim()}`);
    await copyFile(stagedArchive, archivePath, constants.COPYFILE_EXCL); createdOutputs.push(archivePath);
    await writeFile(manifestPath, manifestBytes, { flag: 'wx', mode: 0o600 }); createdOutputs.push(manifestPath);
    const archiveSha256 = hashBytes(await readFile(stagedArchive));
    return { archivePath, manifestPath, archiveSha256, manifest };
  } catch (error) {
    // Remove only exact output files created by this attempt, never older releases.
    for (const target of createdOutputs) await rm(target, { force: true });
    throw error;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

export function parseReleaseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]; const value = args[index + 1];
    if (!['--version', '--commit', '--output'].includes(name) || !value || value.startsWith('--') || Object.hasOwn(options, name.slice(2))) throw new Error('Usage: node scripts/package-release.mjs --version 1.0.0-qa.123.1 --commit <40-hex-SHA> [--output release-artifacts]');
    options[name.slice(2)] = value;
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { archivePath, manifestPath, archiveSha256 } = await createReleasePackage(parseReleaseArgs(process.argv.slice(2)));
    console.log(JSON.stringify({ archive: archivePath, manifest: manifestPath, archive_sha256: archiveSha256 }, null, 2));
  } catch (error) { console.error(`Release packaging failed: ${error.message}`); process.exitCode = 1; }
}
