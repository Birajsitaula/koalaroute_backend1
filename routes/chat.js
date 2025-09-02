import OpenAI from "openai";
import { Router as ExpressRouter } from "express";

const router = ExpressRouter();

router.post("/", async (req, res) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  await connectDB();

  try {
    const { user_query, history } = req.body;
    if (!user_query)
      return res.status(400).json({ ai_response: "No query provided." });

    const messages = history.map((msg) => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.content,
    }));

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
    res.json({ ai_response: aiMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ai_response: "Error connecting to OpenAI API." });
  }
});

export default router;
