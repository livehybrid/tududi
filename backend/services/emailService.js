const nodemailer = require('nodemailer');
const { getConfig } = require('../config/config');
const config = getConfig();

function createTransport() {
    if (!config.smtp.host) {
        return null;
    }
    return nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port || 587,
        secure: config.smtp.secure,
        auth:
            config.smtp.user && config.smtp.password
                ? {
                      user: config.smtp.user,
                      pass: config.smtp.password,
                  }
                : undefined,
    });
}

async function sendEmail({ to, subject, text }) {
    const transporter = createTransport();
    if (!transporter) {
        throw new Error('SMTP configuration missing');
    }
    await transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        text,
    });
}

module.exports = { sendEmail };
