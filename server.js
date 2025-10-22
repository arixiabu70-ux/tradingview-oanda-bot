import express from "express";

const app = express();
app.use(express.json());

// Healthcheck 用ルート
app.get("/", (req, res) => {
  res.status(200).send("Server is alive!");
});

// Webhook 受信
app.post("/webhook", (req, res) => {
    console.log("📩 Webhook受信:", req.body);
    res.status(200).send("Webhook received!");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
