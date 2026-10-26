import test from 'node:test';
import assert from 'node:assert/strict';
import { canSendConsultationEmailReply } from '../src/api/consultationEmailAccess.js';

const consultation = { email: 'client@example.test', assigned_to_user_id: 'staff-1' };
const staff = { id: 'staff-1', email: 'staff@example.test' };

test('email reply action is available to the assigned staff member when both emails are valid', () => {
  assert.equal(canSendConsultationEmailReply(consultation, staff), true);
});

test('email reply action is hidden when the request is unassigned or assigned to someone else', () => {
  assert.equal(canSendConsultationEmailReply({ ...consultation, assigned_to_user_id: null }, staff), false);
  assert.equal(canSendConsultationEmailReply(consultation, { ...staff, id: 'staff-2' }), false);
});

test('email reply action is hidden if either sender or client email is missing or invalid', () => {
  assert.equal(canSendConsultationEmailReply(consultation, { ...staff, email: '' }), false);
  assert.equal(canSendConsultationEmailReply(consultation, { ...staff, email: 'invalid' }), false);
  assert.equal(canSendConsultationEmailReply({ ...consultation, email: '' }, staff), false);
  assert.equal(canSendConsultationEmailReply({ ...consultation, email: 'invalid' }, staff), false);
});
