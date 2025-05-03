import nodemailer from "nodemailer";
import User from "../models/UserModel.js";
import dotenv from "dotenv";

dotenv.config();

// Log environment configuration for debugging
console.log("Environment loaded");
console.log("Email user configured:", process.env.EMAIL_USER ? "Yes" : "No");
console.log("Email pass configured:", process.env.EMAIL_PASS ? "Yes" : "No");

// Create reusable transporter with your custom email domain
let transporterConfig = {
  host: "mail.theartender.com", // Changed to match your MX record
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER?.trim() || "connect@theartender.com",
    pass: process.env.EMAIL_PASS?.trim() || "",
  },
  // Add debug options for troubleshooting
  debug: true,
  logger: true,
  // Adding timeout options
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 15000,
  // Add TLS options for more compatibility
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
};

console.log("Transporter configuration:", JSON.stringify({
  ...transporterConfig,
  auth: {
    user: transporterConfig.auth.user,
    pass: transporterConfig.auth.pass ? "***" : "Not provided"
  }
}));

const transporter = nodemailer.createTransport(transporterConfig);

// Verify transporter connection on startup
console.log("Verifying SMTP connection...");
transporter.verify()
  .then(() => console.log("SMTP server connection established successfully"))
  .catch(err => {
    console.error("SMTP server connection error:", err);
    console.error("Error details:", err.stack);
  });

/**
 * Generate HTML email template for user messages
 * @param {Object} user - User data object
 * @returns {string} - HTML email content
 */
const generateUserEmailTemplate = (user) => {
  // Sanitize inputs to prevent XSS
  const sanitizeInput = (input) => {
    if (!input) return '';
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #e53e3e; border-bottom: 1px solid #eee; padding-bottom: 10px;">🎉 New User Message</h2>
      <p>A new user has just sent a message on Artender with the following details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr style="background-color: #f8f8f8;"><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${sanitizeInput(user.name)}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${sanitizeInput(user.email)}</td></tr>
        <tr style="background-color: #f8f8f8;"><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${sanitizeInput(user.phone)}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${sanitizeInput(user.company)}</td></tr>
        <tr style="background-color: #f8f8f8;"><td style="padding: 8px; vertical-align: top;"><strong>Message:</strong></td><td style="padding: 8px;">${sanitizeInput(user.message)}</td></tr>
      </table>
      <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">© ${new Date().getFullYear()} Artender. All rights reserved.</p>
    </div>
  `;
};

/**
 * Controller function to handle new user message submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response
 */
export const NewUser = async (req, res) => {
  const userData = req.body;

  // Basic validation
  if (!userData.email || !userData.message) {
    return res.status(400).json({
      success: false,
      msg: "Email and message are required fields"
    });
  }

  try {
    // Save user data to database - use findOneAndUpdate with upsert to handle duplicates
    const user = await User.findOneAndUpdate(
      { email: userData.email },
      {
        $set: userData,
        $push: { messageHistory: { message: userData.message, timestamp: new Date() } }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    // Use your custom email for both sending and receiving
    const recipientEmail = process.env.NOTIFICATION_EMAIL || "connect@theartender.com";

    const mailOptions = {
      from: `"Artender Contact" <connect@theartender.com>`,
      to: recipientEmail,
      subject: "🧑 New User Message from Artender",
      html: generateUserEmailTemplate(userData),
      replyTo: userData.email, // Allow direct reply to user
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      msg: "Message received and notification sent",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("User message error:", error);
    console.error("Error stack:", error.stack);

    // Log more detailed SMTP errors
    if (error.code === 'EAUTH') {
      console.error("SMTP Authentication error - check your credentials");
    } else if (error.code === 'ESOCKET') {
      console.error("SMTP Socket error - check your host and port settings");
    } else if (error.code === 'ECONNECTION') {
      console.error("SMTP Connection error - check your host settings and firewall");
    } else if (error.code === 'ETIMEDOUT') {
      console.error("SMTP Timeout error - the server took too long to respond");
    }

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      try {
        console.log("Duplicate key error, attempting to send email anyway");
        // Just send the email without creating a new user
        const recipientEmail = process.env.NOTIFICATION_EMAIL || "connect@theartender.com";

        const mailOptions = {
          from: `"Artender Contact" <connect@theartender.com>`,
          to: recipientEmail,
          subject: "🧑 New User Message from Artender",
          html: generateUserEmailTemplate(userData),
          replyTo: userData.email,
        };

        console.log("Sending fallback email");
        await transporter.sendMail(mailOptions);
        console.log("Fallback email sent successfully");

        return res.status(200).json({
          success: true,
          msg: "Message received and notification sent",
          info: "Email already exists in our database"
        });
      } catch (emailError) {
        console.error("Failed to send email after duplicate error:", emailError);
        console.error("Email error details:", emailError.stack);
        return res.status(500).json({
          success: false,
          msg: "Failed to process your message. Please try again later."
        });
      }
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: "Validation error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Failed to process your message. Please try again later."
    });
  }
};

export default NewUser;