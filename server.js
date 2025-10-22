import express from "express";

const app = express();
app.use(express.json());

app.post("/webhook", (req, res) => {
    console.log("📩 Webhook受信:", req.body);
    res.status(200).send("Webhook received!");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
