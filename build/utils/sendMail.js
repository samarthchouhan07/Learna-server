"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
require("dotenv").config();
const sendMail = async (options) => {
    try {
        const transporter = nodemailer_1.default.createTransport({
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
        const templatePath = path_1.default.join(__dirname, "../mails", template);
        // Render the email template using EJS
        const html = await ejs_1.default.renderFile(templatePath, data);
        const mailOptions = {
            from: process.env.SMTP_MAIL,
            to: email,
            subject,
            html,
        };
        // Send the email
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully.");
    }
    catch (error) {
        console.error("Failed to send email:", error);
        throw new Error("Email sending failed."); // Re-throw to handle in calling code
    }
};
exports.sendMail = sendMail;
