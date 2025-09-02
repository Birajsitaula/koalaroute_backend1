import { Router as ExpressRouter } from "express";

const router = ExpressRouter();

router.post("/", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ msg: "All fields required" });

  // Here you can send email using nodemailer or save to DB
  res.json({
    msg: "Contact form submitted successfully",
    data: { name, email, message },
  });
});

export default router;
