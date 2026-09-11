import test from 'node:test';
import assert from 'node:assert/strict';
import { adminLanding, canEditSection } from '../src/api/permissions.js';
test('editor landing and guards respect scoped server permissions', () => {
  const user = { role: 'super', permissions: ['content.write', 'section.projects.write'] };
  assert.equal(canEditSection(user, 'Services'), false);
  assert.equal(canEditSection(user, 'Projects'), true);
  assert.equal(adminLanding(user), '/AdminProjects');
  assert.equal(adminLanding({ role: 'super', permissions: [] }), '/');
  assert.equal(adminLanding({ role: 'admin' }), '/AdminDashboard');
  assert.equal(canEditSection(user, 'About'), false);
  assert.equal(adminLanding({ role: 'super', permissions: ['content.write', 'section.about.write'] }), '/AdminAbout');
  assert.equal(canEditSection({ role: 'viewer', permissions: ['section.about.write'] }, 'About'), false);
});
