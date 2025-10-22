// server.js
import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Webhook受信テスト用
app.post("/webhook", (req, res) => {
  console.log("📩 Webhook受信:", req.body);
  res.status(200).send({ status: "ok", message: "Webhook received" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
