// // app/api/chat/route.js
// import express from "express";
// import OpenAI from "openai";
// import dotenv from "dotenv";

// dotenv.config();
// const router = express.Router();

// // Initialize OpenAI client
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// router.post("/", async (req, res) => {
//   try {
//     const { user_query, history } = req.body;

//     if (!user_query) {
//       return res.status(400).json({ ai_response: "No query provided." });
//     }

//     // Convert messages to OpenAI roles
//     const messages = history.map((msg) => ({
//       role: msg.role === "ai" ? "assistant" : "user",
//       content: msg.content,
//     }));

//     // Optional: add system prompt at the beginning
//     messages.unshift({
//       role: "system",
//       content: "You are KoalaRoute AI, a helpful travel assistant.",
//     });

//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini", // or gpt-4 / gpt-3.5-turbo
//       messages,
//       max_tokens: 500,
//     });

//     const aiMessage =
//       response.choices[0].message.content || "No response from AI";

//     return res.json({ ai_response: aiMessage });
//   } catch (error) {
//     console.error("OpenAI API error:", error);
//     return res
//       .status(500)
//       .json({ ai_response: "Error connecting to OpenAI API." });
//   }
// });

// export default router; // ✅ default export

// app/api/chat/route.js
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import Chat from "../../models/Chat.js"; // Import Chat model
import mongoose from "mongoose";
import auth from "../../middleware/auth.js"; // You'll need to create this

dotenv.config();
const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Connect to MongoDB (you might have this elsewhere, but ensure it's connected)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

connectDB();

// Add authentication middleware
router.use(auth);

router.post("/", async (req, res) => {
  try {
    const { user_query, history } = req.body;
    const userId = req.user._id; // Get user ID from auth middleware

    if (!user_query) {
      return res.status(400).json({ ai_response: "No query provided." });
    }

    if (!userId) {
      return res.status(401).json({ ai_response: "User not authenticated." });
    }

    // Convert messages to OpenAI roles
    const messages = history.map((msg) => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.content,
    }));

    // Optional: add system prompt at the beginning
    messages.unshift({
      role: "system",
      content: "You are KoalaRoute AI, a helpful travel assistant.",
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
    });

    const aiMessage =
      response.choices[0].message.content || "No response from AI";

    // ✅ SAVE TO DATABASE
    try {
      // Find existing chat for user or create new one
      let chat = await Chat.findOne({ user: userId });

      if (!chat) {
        chat = new Chat({
          user: userId,
          messages: [],
        });
      }

      // Add the new conversation to messages
      chat.messages.push(
        { role: "user", content: user_query },
        { role: "assistant", content: aiMessage }
      );

      await chat.save();
      console.log("Chat saved successfully for user:", userId);
    } catch (dbError) {
      console.error("Database save error:", dbError);
      // Don't return error to user, just log it
    }

    return res.json({
      ai_response: aiMessage,
      success: true,
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return res.status(500).json({
      ai_response: "Error connecting to OpenAI API.",
      success: false,
    });
  }
});

export default router;
