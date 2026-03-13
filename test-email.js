require("dotenv").config();
const { sendEmail } = require("./middleware/emailService");

const runTest = async () => {
  try {
    const result = await sendEmail({
      to: "harishtaliyan@gmail.com",
      subject: "Test Email from Resend",
      text: "This is a test email sent using the Resend API.",
      html: "<p>This is a test email sent using the <b>Resend API</b>.</p>"
    });
    console.log("Email sent successfully!");
    console.log("Response:", result);
  } catch (error) {
    console.error("Failed to send test email:", error);
  }
};

runTest();
