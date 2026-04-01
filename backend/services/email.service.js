import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465, // Use SSL Port 465
    secure: true, // Use SSL
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendPasswordResetEmail = async (email, token) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('Email service is not configured (missing SMTP_USER or SMTP_PASS).');
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const senderEmail = process.env.SMTP_USER;

    const mailOptions = {
        from: `"SOEN App" <${senderEmail}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333;">Password Reset</h2>
                <p>You requested a password reset. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                </div>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <p style="color: #888; font-size: 12px;">The link will expire in 15 minutes.</p>
                <hr style="border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 10px; color: #aaa;">Antigravity AI Assistant</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error(error.message || 'Failed to send reset email. Please check your SMTP settings.');
    }
};
