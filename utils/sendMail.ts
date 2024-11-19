import nodemailer, { Transporter } from "nodemailer";
import ejs from "ejs";
import path from "path";
require("dotenv").config();

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

export const sendMail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter: Transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com", // Default to Gmail
      port: parseInt(process.env.SMTP_PORT || "587"), // Default to 587 for TLS
      secure: process.env.SMTP_PORT === "465", // Use true for SSL
      auth: {
        user: process.env.SMTP_MAIL, // Sender's email
        pass: process.env.SMTP_PASSWORD, // App password or SMTP password
      },
    });

    const { email, subject, template, data } = options;

    // Resolve the template file path
    const templatePath = path.join(__dirname, "../mails", template);

    // Render the email template using EJS
    const html: string = await ejs.renderFile(templatePath, data);

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email, 
      subject,
      html, 
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully.");
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Email sending failed."); // Re-throw to handle in calling code
  }
};
