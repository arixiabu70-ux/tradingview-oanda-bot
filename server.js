// server.js
import express from "express"
import fetch from "node-fetch"

const app = express()
app.use(express.json()) // JSON受信可能にする

// OANDA設定
const OANDA_API_URL = "https://api-fxpractice.oanda.com/v3"
const ACCOUNT_ID = "あなたのOANDAアカウントID"
const ACCESS_TOKEN = "あなたのOANDAアクセストークン"

// TradingView からの Webhook を受け取る
app.post("/webhook", async (req, res) => {
  const data = req.body
  console.log("受信:", data)

  try {
    // TradingView のアラートで "side":"buy" or "sell" を送信しておく
    const side = data.side
    const instrument = data.symbol || "USD_JPY"
    const units = side === "buy" ? 1000 : -1000 // ロット数設定（例：1000通貨）

    const order = {
      order: {
        instrument,
        units,
        type: "MARKET",
        positionFill: "DEFAULT",
      },
    }

    // OANDA API に注文送信
    const response = await fetch(`${OANDA_API_URL}/accounts/${ACCOUNT_ID}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(order),
    })

    const result = await response.json()
    console.log("OANDA応答:", result)

    res.json({ status: "ok", result })
  } catch (err) {
    console.error(err)
    res.status(500).send("Error placing order")
  }
})

app.listen(3000, () => console.log("🚀 Webhookサーバ起動中 (ポート3000)"))
