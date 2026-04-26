const { sendEmail } = require('../utils/sendEmail');
const User = require('../models/User');

// POST /api/chatbot/support
exports.submitSupportTicket = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const user = req.user; // Populated by protect middleware

        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h2 style="color: #2563eb;">New Customer Support Request</h2>
                <p><strong>From:</strong> ${user.name} (${user.email})</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;">
                <p><strong>Problem Description:</strong></p>
                <p style="background-color: #f8fafc; padding: 15px; border-radius: 8px; color: #334155;">
                    ${message}
                </p>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
                    Reply directly to this email to contact the user.
                </p>
            </div>
        `;

        // Use ADMIN_EMAIL from .env as the primary destination
        // Falls back to admin users in DB if ADMIN_EMAIL is not set
        const adminEmail = process.env.ADMIN_EMAIL;

        if (adminEmail) {
            await sendEmail({
                to: adminEmail,
                subject: `CityBot Support Request: ${user.name}`,
                html,
                replyTo: user.email
            });
        } else {
            // Fallback: send to all admin-role users in DB
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
                await sendEmail({
                    to: admin.email,
                    subject: `CityBot Support Request: ${user.name}`,
                    html,
                    replyTo: user.email
                });
            }
        }

        res.json({ 
            reply: "Your message has been sent to our support team! 📧 We will get back to you at your registered email address shortly." 
        });

    } catch (error) {
        console.error('Support ticket error:', error.message);
        res.status(500).json({
            error: 'Support system is unavailable',
            details: error.message,
        });
    }
};
