const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();

const generateEmail = require("./services/groqService");


const app = express();
let emailHistory = [];

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://delightful-hamster-13471d.netlify.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.get("/", (req, res) => {
    res.send("Student Email Backend is running");
});

app.post("/send-email", async (req, res) => {
    try {


        console.log("Request body:", req.body);

        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: "Request body is missing. Please send JSON data."
            });
        }

        const { to, category, absentDays } = req.body;

        if (!to || !category) {
            return res.status(400).json({
                success: false,
                message: "Student email and category are required"
            });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(to)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        if (
            category === "attendance" &&
            (!Number.isInteger(Number(absentDays)) ||
                Number(absentDays) <= 3 ||
                Number(absentDays) > 365)
        ) {
            return res.status(400).json({
                success: false,
                message: "Attendance warnings require more than 3 absent days"
            });
        }

        console.log("Generating email using Groq...");

        const email = await generateEmail(
            category,
            Number(absentDays)
        );

        console.log("Sending generated email...");

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject: email.subject,
            text: email.message
        });


        console.log("Email sent:", info.messageId);
        emailHistory.push({
            to,
            category,
            absentDays: category === "attendance"
                ? Number(absentDays)
                : null,
            subject: email.subject,
            messageId: info.messageId,
            sentAt: new Date()
        });


        return res.status(200).json({
            success: true,
            message: "AI-generated email sent successfully",
            subject: email.subject,
            generatedMessage: email.message
        });

    } catch (error) {
        console.error("Email sending error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to generate or send the email"
        });
    }
});

app.get("/attendance/stats", (req, res) => {
    try {
        const categoryCounts = {
            attendance: 0,
            culture: 0,
            academic: 0,
            house: 0
        };

        const studentAbsences = {};

        emailHistory.forEach((email) => {
            if (Object.hasOwn(categoryCounts, email.category)) {
                categoryCounts[email.category]++;
            }

            if (
                email.category === "attendance" &&
                email.absentDays !== null &&
                email.absentDays !== undefined
            ) {
                studentAbsences[email.to] = Math.max(
                    studentAbsences[email.to] || 0,
                    Number(email.absentDays)
                );
            }
        });

        res.status(200).json({
            totalWarnings: categoryCounts.attendance,
            totalEmails: emailHistory.length,
            categoryCounts,
            students: Object.entries(studentAbsences).map(
                ([email, absentDays]) => ({
                    email,
                    absentDays
                })
            )
        });
    } catch (error) {
        console.error("Statistics route error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load attendance statistics"
        });
    }
});

const PORT = process.env.PORT || 4000;

app.get("/send-email", (req, res) => {
    res.send("Email API is working! Use a POST request to send an email.");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});