import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
    if (transporter !== undefined && transporter !== null) {
        return transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
        try {
            transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: {
                    user,
                    pass,
                },
            });
            console.log(`[Nodemailer] SMTP transporter initialized successfully for: ${host}`);
        } catch (err) {
            console.error("[Nodemailer] Failed to initialize SMTP transporter:", err);
            transporter = null;
        }
    } else {
        console.log("[Nodemailer] SMTP environment variables are not configured. Falling back to console-logging mode.");
        transporter = null;
    }

    return transporter;
}

export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string;
    subject: string;
    html: string;
}) {
    const tx = getTransporter();

    if (tx) {
        try {
            const info = await tx.sendMail({
                from: process.env.SMTP_FROM || '"Munchies Support" <support@munchies.com>',
                to,
                subject,
                html,
            });
            console.log(`[Nodemailer] Email successfully sent to ${to}: "${subject}"`);
            return info;
        } catch (error) {
            console.error(`[Nodemailer] Error sending email to ${to}:`, error);
        }
    } else {
        // Fallback console logger
        console.log(`
========================================================================
[Nodemailer Mock Email Log]
To:      ${to}
Subject: ${subject}
------------------------------------------------------------------------
HTML Content:
${html.replace(/<[^>]*>/g, " ").trim().replace(/\s+/g, " ")}
========================================================================
        `);
    }
}
