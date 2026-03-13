const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to,
      subject,
      text,
      html
    });
    return { success: true, data };
  } catch (error) {
    console.error("Resend API Error:", error);
    throw new Error(error.message);
  }
};

module.exports = { sendEmail };
