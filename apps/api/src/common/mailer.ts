import nodemailer from 'nodemailer';

// Free option: any SMTP account (e.g. Gmail with an app password): SMTP_URL="smtps://user%40gmail.com:app-password@smtp.gmail.com:465"
// Without SMTP_URL, emails are printed to the API console (local development).
const transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;
const FROM = process.env.MAIL_FROM ?? 'Meva Mantra <no-reply@mevamantra.in>';

export const mailConfigured = () => !!transport;

export async function sendMail(to: string, subject: string, text: string) {
  if (!transport) {
    console.log(`\n[mail:dev] to=${to}\nsubject: ${subject}\n${text}\n`);
    return;
  }
  try {
    await transport.sendMail({ from: FROM, to, subject, text });
  } catch (e) {
    console.error('[mail] failed:', (e as Error).message); // never break the request because an email failed
  }
}
