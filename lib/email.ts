// @/lib/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Production / Serverless optimizations
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

export async function sendOrderEmail(to: string, subject: string, html: string) {
  if (!to || !subject || !html) {
    console.error("❌ Email missing required fields");
    return;
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("❌ SMTP credentials not found in environment");
    return;
  }

  const mailOptions = {
    from: `"Ziwara Jewels" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: html.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} | MsgId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("❌ EMAIL FAILED:", {
      to,
      subject,
      code: err.code,
      responseCode: err.responseCode,
      message: err.message,
    });

    if (err.code === 'EAUTH' || err.responseCode === 535) {
      console.error("🔑 Gmail Auth Error → Regenerate App Password now!");
    }
    if (err.code === 'ETIMEDOUT') {
      console.error("⏱️ Timeout → Gmail slow or Vercel cold start");
    }

    // Do not throw – order must succeed
    return { success: false };
  }
}