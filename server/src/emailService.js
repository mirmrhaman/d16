import nodemailer from 'nodemailer';
import { httpError } from './security.js';

const validAddress = (value) => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function createEmailService({ env = process.env, createTransport = nodemailer.createTransport } = {}) {
  let transport;

  const configuration = () => {
    const host = String(env.SMTP_HOST || '').trim();
    const port = Number(env.SMTP_PORT || 465);
    const user = String(env.SMTP_USER || '').trim();
    const password = env.SMTP_PASSWORD;
    const from = String(env.SMTP_FROM || user).trim();
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !validAddress(user) || typeof password !== 'string' || !password || !validAddress(from)) {
      throw httpError(503, 'Email sending is not configured on this server.');
    }
    return { host, port, user, password, from };
  };

  return {
    assertConfigured() { configuration(); },
    async sendConsultationReply({ to, body }) {
      if (!validAddress(to)) throw httpError(400, 'This request does not have a valid reply email address.');
      const config = configuration();
      transport ||= createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.password },
        tls: { minVersion: 'TLSv1.2' },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
      const info = await transport.sendMail({
        from: config.from,
        to,
        replyTo: config.from,
        subject: 'D16 Interior — reply to your enquiry',
        text: body,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      const accepted = (info.accepted || []).some((address) => String(address).toLowerCase() === to.toLowerCase());
      if (!accepted || (info.rejected || []).some((address) => String(address).toLowerCase() === to.toLowerCase())) {
        throw new Error('The mail server did not accept the recipient.');
      }
      return { accepted: true };
    },
  };
}
