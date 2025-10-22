// server.js
import express from "express";

const app = express();
app.use(express.json());

// Railway の PORT 環境変数を使う
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// Webhook 用エンドポイント
app.post("/webhook", (req, res) => {
  console.log("📩 Webhook received:", req.body);
  res.status(200).send("Webhook received");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
