import test from 'node:test';
import assert from 'node:assert/strict';
import { ABOUT_PAGE_ID, DEFAULT_ABOUT, resolveAboutContent, safeAboutImage } from '../src/data/aboutContent.js';

test('About defaults preserve the existing sections and initial profiles', () => {
  assert.match(ABOUT_PAGE_ID, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(DEFAULT_ABOUT.title, 'About Us');
  assert.equal(DEFAULT_ABOUT.mission_title, 'Our Mission');
  assert.equal(DEFAULT_ABOUT.vision_title, 'Our Vision');
  assert.equal(DEFAULT_ABOUT.team_members.length, 4);
  assert.equal(DEFAULT_ABOUT.approach_steps.length, 4);
  assert.deepEqual(resolveAboutContent(null), DEFAULT_ABOUT);
});

test('About content respects edited text and intentionally emptied lists', () => {
  const content = resolveAboutContent({ title: 'Our Studio', mission_text: 'Our updated mission.', subtitle: '', team_members: [], approach_steps: [] });
  assert.equal(content.title, 'Our Studio');
  assert.equal(content.mission_text, 'Our updated mission.');
  assert.equal(content.subtitle, '');
  assert.deepEqual(content.team_members, []);
  assert.deepEqual(content.approach_steps, []);
  assert.equal(DEFAULT_ABOUT.team_members.length, 4);
});

test('About content tolerates malformed local preview records without rendering objects', () => {
  const content = resolveAboutContent({
    title: { html: 'untrusted' },
    team_members: [null, { name: {}, role: 'Designer' }, { id: 'valid', name: 'Approved profile', role: 'Designer', image: '' }],
    approach_steps: [null, { title: 'Discovery', description: {} }],
  });
  assert.equal(content.title, DEFAULT_ABOUT.title);
  assert.deepEqual(content.team_members.map((member) => member.id), ['valid']);
  assert.deepEqual(content.approach_steps, []);
});

test('About image URLs allow hosted images and demo rasters but reject executable protocols', () => {
  for (const url of ['https://images.example.com/team.jpg', 'http://localhost:3001/uploads/photo.png', '/uploads/team.webp', '/uploads/about/team-123.JPG', 'data:image/png;base64,aGVsbG8=']) {
    assert.equal(safeAboutImage(url), url);
  }
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html;base64,aGVsbG8=', 'data:image/svg+xml;base64,aGVsbG8=', '//untrusted.example/team.png', '/\\untrusted.example/team.png', '/uploads/team.svg', '/uploads/../team.png', '/uploads/team.gif', '/uploads/team.png?download=1', 'https://user:password@example.com/team.png', ' https://example.com/team.png', 'https://example.com/team photo.png', '', null, {}]) {
    assert.equal(safeAboutImage(url), undefined);
  }
});
