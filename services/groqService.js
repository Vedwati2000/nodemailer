const Groq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const categories = {
    attendance: {
        subject: "Attendance Warning Notice",
        instruction: "Write a respectful but firm attendance warning."
    },
    culture: {
        subject: "Student Conduct and Campus Culture",
        instruction: "Write a constructive message addressing a specific, documented concern about student conduct. Do not invent incidents."
    },
    academic: {
        subject: "Academic Achievement Appreciation",
        instruction: "Write an encouraging appreciation email for a student's academic performance without inventing achievements."
    },
    house: {
        subject: "House Winner Appreciation",
        instruction: "Write a congratulatory email for a student's house competition achievement without inventing details."
    }
};

async function generateEmail(category, absentDays) {
    const selectedCategory = categories[category];

    if (!selectedCategory) {
        throw new Error("Invalid email category");
    }

    const attendanceDetails =
        category === "attendance"
            ? `The student has been absent for ${absentDays} consecutive days.`
            : "";

    const response = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
            {
                role: "system",
                content: `
You are an AI assistant that writes professional emails for students.

Write clear, respectful, natural email messages.
Use the tone appropriate for the selected category.
Do not invent student names, events, achievements, or incidents.
Return only the email body, including a greeting and closing.
Do not include a subject line in the body.
`
            },
            {
                role: "user",
                content: `
Category: ${selectedCategory.subject}

Instructions: ${selectedCategory.instruction}

${attendanceDetails}

Generate a complete email body suitable for sending to a student.
`
            }
        ],
        temperature: 0.7,
        max_tokens: 500
    });

    const message = response.choices[0]?.message?.content?.trim();

    if (!message) {
        throw new Error("Groq did not generate an email message");
    }

    return {
        subject: selectedCategory.subject,
        message
    };
}

module.exports = generateEmail;