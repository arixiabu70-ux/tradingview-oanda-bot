import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ==== OANDA API 情報 ====
const OANDA_API_KEY = process.env.OANDA_API_KEY || "YOUR_OANDA_API_KEY";
const ACCOUNT_ID = process.env.ACCOUNT_ID || "YOUR_OANDA_ACCOUNT_ID";
const OANDA_URL = "https://api-fxpractice.oanda.com"; // 本番は api-fxtrade.oanda.com

// ==== ロット数 & リスクリワード ====
const TRADE_UNITS = 20000;

// ==== Webhook 受信処理 ====
app.post("/webhook", async (req, res) => {
  try {
    const { alert, symbol, entryPrice, stopLossPrice, takeProfitPrice } = req.body;
    const instrument = symbol || "USD_JPY";

    console.log("📩 Webhook受信:", req.body);

    let units = 0;
    if (alert === "LONG_ENTRY") units = TRADE_UNITS;
    if (alert === "SHORT_ENTRY") units = -TRADE_UNITS;

    if (units !== 0) {
      // 成行注文 + OANDA 注文で SL/TP 設定
      const orderData = {
        order: {
          instrument,
          units: units.toString(),
          type: "MARKET",
          positionFill: "DEFAULT",
          // SL/TP 設定
          stopLossOnFill: stopLossPrice ? { price: stopLossPrice.toFixed(5) } : undefined,
          takeProfitOnFill: takeProfitPrice ? { price: takeProfitPrice.toFixed(5) } : undefined
        }
      };

      const r = await axios.post(`${OANDA_URL}/v3/accounts/${ACCOUNT_ID}/orders`, orderData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OANDA_API_KEY}`
        }
      });

      console.log(`✅ ${units > 0 ? "ロング" : "ショート"}注文成功`, r.data);
      return res.status(200).send("Order placed successfully");
    }

    // 決済系アラート (Chandelier転換や ZLSMAクロスなど)
    if (alert === "LONG_EXIT" || alert === "SHORT_EXIT") {
      const closeData = alert === "LONG_EXIT" ? { longUnits: "ALL" } : { shortUnits: "ALL" };
      const r = await axios.put(`${OANDA_URL}/v3/accounts/${ACCOUNT_ID}/positions/${instrument}/close`, closeData, {
        headers: { Authorization: `Bearer ${OANDA_API_KEY}`, "Content-Type": "application/json" }
      });

      console.log(`💰 ${alert} 決済成功`, r.data);
      return res.status(200).send("Position closed successfully");
    }

    res.status(400).send("Unknown alert type");
  } catch (error) {
    console.error("❌ エラー:", error.response?.data || error.message);
    res.status(500).send("Server error");
  }
});

// ==== サーバー起動 ====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
