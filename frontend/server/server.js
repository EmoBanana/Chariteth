// server.js with corrected Gemini API integration
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000", // Your React app's address
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

// Test route to verify server is running
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is running correctly" });
});

// Route to handle AI summary generation
app.post("/api/generate-summary", async (req, res) => {
  console.log("Received generate-summary request");

  try {
    const { project } = req.body;

    if (!project) {
      console.error("Missing project data in request");
      return res.status(400).json({ error: "Project details are required" });
    }

    console.log("Project data received:", project);

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("API key is missing");
      return res
        .status(500)
        .json({ error: "Server configuration error: Missing API key" });
    }

    console.log("Sending request to Gemini API...");

    // Initialize Gemini with the new method
    const genAI = new GoogleGenAI({ apiKey });

    // Create the prompt content for Gemini
    const content = `Generate a concise summary (max 50 words) and an impact score (0-100) for this charity project:
      
      Title: ${project.title}
      Description: ${project.description}
      Additional Info: ${project.metadata || ""}
      Funding Goal: ${project.fundingGoal} ETH
      Currently Raised: ${project.totalRaised} ETH
      Creator: ${project.creator}
      
      Please respond ONLY with pure JSON in this format:
      {
        "summary": "<summary_text>",
        "impactScore": <numeric_score>
      }
      Do not include any additional text, markdown, or explanations. Just the JSON object.
    `;

    // Call Gemini API with the new method
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: content,
    });

    const textResponse = response.candidates[0].content.parts[0].text;

    console.log("Received response from Gemini API");
    console.log("Gemini response content:", textResponse);

    // Parse the JSON response from Gemini
    try {
      // Remove markdown-style code block wrappers if they exist
      const cleanedText = textResponse.replace(/```json|```/g, "").trim();

      // Parse the cleaned text as JSON
      const parsedContent = JSON.parse(cleanedText);

      // Send the processed result back to the frontend
      console.log("Sending response to frontend:", {
        summary: parsedContent.summary,
        impactScore: parseInt(parsedContent.impactScore),
      });

      res.json({
        summary: parsedContent.summary,
        impactScore: parseInt(parsedContent.impactScore),
      });
    } catch (parseError) {
      console.error("Error parsing cleaned response:", parseError);
      res.status(500).json({
        error: "Failed to parse AI response",
        details: parseError.message,
        rawContent: textResponse,
      });
    }
  } catch (error) {
    console.error("Error generating AI summary:", error.message);

    // Enhanced error reporting
    const errorDetails = error.response
      ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        }
      : { message: error.message };

    console.error("Error details:", JSON.stringify(errorDetails, null, 2));

    res.status(500).json({
      error: "Failed to generate summary",
      details: error.message,
      errorInfo: errorDetails,
    });
  }
});

app.post("/api/generate-thank-you", async (req, res) => {
  const { title, description, donationAmount } = req.body;

  // Example AI-generated message
  const message = `That's fire! You just donated ${donationAmount} ETH to "${title}". Your contribution will help ${Math.floor(
    donationAmount * 200
  )} people!`;

  res.json({ message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Key present: ${!!process.env.GEMINI_API_KEY}`);
});
