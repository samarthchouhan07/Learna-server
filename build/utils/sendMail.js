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
            service: 'gmail',
            auth: {
                user: process.env.SMTP_MAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });
        const { email, subject, template, data } = options;
        const templatePath = path_1.default.join(__dirname, "../mails", template);
        const html = await ejs_1.default.renderFile(templatePath, data);
        const mailOptions = {
            from: process.env.SMTP_MAIL,
            to: email,
            subject,
            html,
        };
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully.");
    }
    catch (error) {
        console.error("Failed to send email:", error);
        throw new Error("Email sending failed.");
    }
};
exports.sendMail = sendMail;
