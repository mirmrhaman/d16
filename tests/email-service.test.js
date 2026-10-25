import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmailService } from '../server/src/emailService.js';

test('SMTP replies use configured authenticated TLS and plain text only', async () => {
  let transportOptions;
  let sent;
  const service = createEmailService({
    env: { SMTP_HOST: 'mail.d16interior.com', SMTP_PORT: '465', SMTP_USER: 'admin@d16interior.com', SMTP_PASSWORD: 'unit-test-only', SMTP_FROM: 'admin@d16interior.com' },
    createTransport: (options) => {
      transportOptions = options;
      return { sendMail: async (message) => { sent = message; return { accepted: [message.to], rejected: [] }; } };
    },
  });
  service.assertConfigured();
  await service.sendConsultationReply({ to: 'visitor@example.test', body: 'Thank you for contacting D16.' });
  assert.equal(transportOptions.host, 'mail.d16interior.com');
  assert.equal(transportOptions.port, 465);
  assert.equal(transportOptions.secure, true);
  assert.equal(transportOptions.tls.minVersion, 'TLSv1.2');
  assert.deepEqual(transportOptions.auth, { user: 'admin@d16interior.com', pass: 'unit-test-only' });
  assert.equal(sent.from, 'admin@d16interior.com');
  assert.equal(sent.to, 'visitor@example.test');
  assert.equal(sent.text, 'Thank you for contacting D16.');
  assert.equal(Object.hasOwn(sent, 'html'), false);
  assert.equal(Object.hasOwn(sent, 'attachments'), false);
});

test('SMTP service refuses incomplete configuration and invalid recipients', async () => {
  const missing = createEmailService({ env: {} });
  assert.throws(() => missing.assertConfigured(), (error) => error.status === 503);
  const configured = createEmailService({ env: { SMTP_HOST: 'mail.d16interior.com', SMTP_USER: 'admin@d16interior.com', SMTP_PASSWORD: 'unit-test-only' } });
  await assert.rejects(configured.sendConsultationReply({ to: 'not-an-email', body: 'Hi' }), (error) => error.status === 400);
});
