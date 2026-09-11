import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectReleaseFiles, createReleasePackage, parseReleaseArgs, validateReleaseIdentity } from '../scripts/package-release.mjs';

const COMMIT = 'a'.repeat(40);
async function fixture(t) {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), 'd16-package-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  async function put(name, contents = 'Synthetic public test data') {
    const target = path.join(root, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  await put('package.json', '{"name":"synthetic-d16","version":"0.0.0"}');
  await put('package-lock.json', '{"lockfileVersion":3}');
  await put('dist/index.html', '<h1>Synthetic D16 release</h1>');
  await put('dist/assets/app.js', 'console.log("Synthetic public bundle");');
  await put('dist/_redirects', '/* /index.html 200');
  await put('server/src/index.js', 'export const qaOnly = true;');
  await put('database/schema.mysql.sql', '-- Synthetic schema');
  await put('database/migrations/001_example.sql', '-- Synthetic migration');
  return { root, put };
}

test('release identity and CLI validation reject unsafe names and incomplete commit IDs', () => {
  assert.deepEqual(validateReleaseIdentity('1.0.0-qa.123.1', COMMIT.toUpperCase()), { version: '1.0.0-qa.123.1', commit: COMMIT });
  assert.equal(validateReleaseIdentity('1.2.3+build.4', COMMIT).version, '1.2.3+build.4');
  for (const version of ['../1.0.0', 'v1.0.0', '01.0.0', '1.0', '1.0.0-qa.01', '1.0.0;touch x', '1.0.0\n', '', undefined]) assert.throws(() => validateReleaseIdentity(version, COMMIT));
  for (const commit of ['main', 'a'.repeat(39), 'z'.repeat(40), '../' + COMMIT, '', undefined]) assert.throws(() => validateReleaseIdentity('1.0.0', commit), /40-character/);
  assert.deepEqual(parseReleaseArgs(['--version', '1.0.0', '--commit', COMMIT, '--output', 'release-artifacts']), { version: '1.0.0', commit: COMMIT, output: 'release-artifacts' });
  for (const args of [['--version'], ['--unexpected', 'value'], ['--version', '1.0.0', '--version', '2.0.0'], ['--output', '--commit']]) assert.throws(() => parseReleaseArgs(args), /Usage:/);
});

test('release collector includes only built frontend, runtime, package files and numbered migrations', async (t) => {
  const { root, put } = await fixture(t);
  for (const name of ['.env', '.env.production', '.git/config', 'database/.env.qa.local', 'database/production.dump.sql', 'database/seed.qa.synthetic.mysql.sql', 'uploads/client.png', 'node_modules/dependency/index.js', 'server/src/.env', 'server/src/credentials.json', 'server/src/private.key', 'server/src/local-secrets.js', 'server/src/uploads/client.jpg', 'dist/.env', 'dist/credentials.json', 'dist/secrets.js', 'dist/client-backup.json', 'dist/db-dump.json', 'dist/dump.sql', 'dist/database.db', 'dist/backup.tar.gz', 'dist/uploads/client.jpg', 'dist/node_modules/package/index.js', 'dist/assets/app.js.map']) await put(name, 'MUST NEVER BE PACKAGED');
  const files = await collectReleaseFiles(root);
  assert.deepEqual(files.map((file) => file.path).sort(), [
    'database/migrations/001_example.sql', 'database/schema.mysql.sql', 'dist/_redirects', 'dist/assets/app.js', 'dist/index.html', 'package-lock.json', 'package.json', 'server/src/index.js',
  ].sort());
  for (const file of files) {
    assert.equal(file.size, file.bytes.length);
    assert.equal(file.sha256, createHash('sha256').update(file.bytes).digest('hex'));
    assert(!file.bytes.toString().includes('MUST NEVER BE PACKAGED'));
  }
});

test('release collector rejects symlinked files and input directories', async (t) => {
  for (const kind of ['file', 'directory', 'package']) {
    const { root, put } = await fixture(t);
    await put('private-outside-allowlist.txt', 'Never follow this target');
    if (kind === 'file') await symlink(path.join(root, 'private-outside-allowlist.txt'), path.join(root, 'dist/assets/leak.js'));
    if (kind === 'directory') await symlink(path.join(root, 'dist/assets'), path.join(root, 'server/src/linked'));
    if (kind === 'package') {
      await rm(path.join(root, 'package.json'));
      await symlink(path.join(root, 'private-outside-allowlist.txt'), path.join(root, 'package.json'));
    }
    await assert.rejects(collectReleaseFiles(root), /Symlinks are not allowed/);
  }
});

test('versioned archive and external manifest match file hashes and refuse overwrite', async (t) => {
  const { root } = await fixture(t);
  const result = await createReleasePackage({ projectRoot: root, version: '1.0.0-qa.123.1', commit: COMMIT });
  assert.equal(path.basename(result.archivePath), 'd16-1.0.0-qa.123.1.tar.gz');
  assert.equal(result.manifest.version, '1.0.0-qa.123.1'); assert.equal(result.manifest.commit, COMMIT);
  assert(Number.isFinite(Date.parse(result.manifest.built_at)));
  assert.deepEqual(JSON.parse(await readFile(result.manifestPath, 'utf8')), result.manifest);
  const archiveBytes = await readFile(result.archivePath);
  assert.equal(result.archiveSha256, createHash('sha256').update(archiveBytes).digest('hex'));
  const listing = spawnSync('tar', ['-tzf', result.archivePath], { encoding: 'utf8' });
  assert.equal(listing.status, 0, listing.stderr);
  assert.match(listing.stdout, /release-manifest\.json/);
  assert(!listing.stdout.split('\n').some((entry) => entry.startsWith('/') || entry.split('/').includes('..')));
  const manifestExtraction = spawnSync('tar', ['-xOzf', result.archivePath, './release-manifest.json'], { encoding: 'utf8' });
  assert.equal(manifestExtraction.status, 0, manifestExtraction.stderr);
  assert.deepEqual(JSON.parse(manifestExtraction.stdout), result.manifest);
  for (const file of result.manifest.files) {
    const extraction = spawnSync('tar', ['-xOzf', result.archivePath, `./${file.path}`]);
    assert.equal(extraction.status, 0);
    assert.equal(createHash('sha256').update(extraction.stdout).digest('hex'), file.sha256);
  }
  await assert.rejects(createReleasePackage({ projectRoot: root, version: '1.0.0-qa.123.1', commit: 'b'.repeat(40) }), /already exists/);
  assert.deepEqual(await readFile(result.archivePath), archiveBytes);
  const next = await createReleasePackage({ projectRoot: root, output: path.join(root, 'absolute-output'), version: '1.0.1', commit: COMMIT });
  assert.equal(path.dirname(next.archivePath), path.join(root, 'absolute-output'));
  assert.equal(await readFile(path.join(root, 'server/src/index.js'), 'utf8'), 'export const qaOnly = true;');
});

test('release packaging rejects output inside inputs, output symlinks, and missing build entrypoint', async (t) => {
  const { root } = await fixture(t);
  for (const output of ['.', 'dist/releases', 'server/src/releases', 'database/migrations/releases', '/', 'bad\npath']) await assert.rejects(createReleasePackage({ projectRoot: root, version: '1.0.0', commit: COMMIT, output }), /output|Output/);
  await mkdir(path.join(root, 'actual-output'));
  await symlink(path.join(root, 'actual-output'), path.join(root, 'linked-output'));
  await assert.rejects(createReleasePackage({ projectRoot: root, version: '1.0.0', commit: COMMIT, output: 'linked-output' }), /never symlinks/);
  await rm(path.join(root, 'dist/index.html'));
  await assert.rejects(collectReleaseFiles(root), /Build the frontend first/);
});
