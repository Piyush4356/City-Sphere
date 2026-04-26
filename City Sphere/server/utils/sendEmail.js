const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const sendEmail = async (options) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `City Sphere <${process.env.EMAIL_USER}>`,
        to: options.email || options.to,
        subject: options.subject,
        html: options.message || options.html
    };

    if (options.replyTo) {
        mailOptions.replyTo = options.replyTo;
    }

    await transporter.sendMail(mailOptions);
};

const sendOTPEmail = async (email, otp) => {
    try {
        await sendEmail({
            email,
            subject: 'Verify your City Sphere account',
            message: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #2563eb;">City Sphere — Email Verification</h2>
                    <p>Your OTP code is:</p>
                    <h1 style="letter-spacing: 8px; color: #1e40af;">${otp}</h1>
                    <p>This code expires in 10 minutes.</p>
                </div>
            `
        });
        return true;
    } catch (err) {
        console.error('OTP Email error:', err);
        return false;
    }
};

const sendResetEmail = async (email, resetUrl) => {
    await sendEmail({
        email,
        subject: 'Password Reset — City Sphere',
        message: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #2563eb;">Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Reset Password</a>
                <p style="margin-top: 15px; color: #64748b;">This link expires in 10 minutes. If you did not request this, ignore this email.</p>
            </div>
        `
    });
};

module.exports = { sendEmail, sendOTPEmail, sendResetEmail };
