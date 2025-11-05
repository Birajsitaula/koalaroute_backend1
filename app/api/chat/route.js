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

import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
// import Chat from "../../models/Chat.js"; // ✅ Import Chat model
import Chat from "../../../models/Chat.js";

dotenv.config();
const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==========================
// 🟢 POST - Send Message to AI and Save Chat
// ==========================
router.post("/", async (req, res) => {
  try {
    const { user_query, history, userId } = req.body;

    if (!user_query) {
      return res.status(400).json({ ai_response: "No query provided." });
    }

    // Convert frontend history to OpenAI format
    const messages = history.map((msg) => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.content,
    }));

    // Add a system instruction
    messages.unshift({
      role: "system",
      content: "You are KoalaRoute AI, a helpful travel assistant.",
    });

    // Send request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // use gpt-4o-mini or any preferred model
      messages,
      max_tokens: 500,
    });

    const aiMessage =
      response.choices[0].message.content || "No response from AI";

    // ✅ Save chat to MongoDB
    let chat = await Chat.findOne({ user: userId });

    if (chat) {
      chat.messages.push({ role: "user", content: user_query });
      chat.messages.push({ role: "assistant", content: aiMessage });
      await chat.save();
    } else {
      chat = await Chat.create({
        user: userId,
        messages: [
          { role: "user", content: user_query },
          { role: "assistant", content: aiMessage },
        ],
      });
    }

    return res.json({ ai_response: aiMessage });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return res
      .status(500)
      .json({ ai_response: "Error connecting to OpenAI API." });
  }
});

// ==========================
// 🟡 GET - Fetch Chat History for a User
// ==========================
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const chat = await Chat.findOne({ user: userId });

    if (!chat) {
      return res.json({ messages: [] }); // No chat yet
    }

    return res.json({ messages: chat.messages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

// ==========================
// 🔴 DELETE - Delete Chat History for a User
// ==========================
router.delete("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    await Chat.deleteOne({ user: userId });
    res.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

export default router;
