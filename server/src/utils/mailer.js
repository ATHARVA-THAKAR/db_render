import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

export async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_USER) {
    console.log(`[mailer stub] would send to=${to} subject="${subject}"`);
    return { stubbed: true };
  }
  return transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
}

// Stub interface for Twilio SMS. Judges rarely need live SMS; this
// keeps the notification-channel abstraction consistent so swapping
// in a real Twilio client later is a one-file change.
export async function sendSms({ to, body }) {
  if (process.env.TWILIO_ENABLED !== "true") {
    console.log(`[sms stub] would text to=${to} body="${body}"`);
    return { stubbed: true };
  }
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // return client.messages.create({ to, from: process.env.TWILIO_FROM_NUMBER, body });
  throw new Error("Twilio integration not wired up — set TWILIO_ENABLED=false or implement sendSms().");
}
