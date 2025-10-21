import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// === あなたのOANDA API情報を設定 ===
const OANDA_API_KEY = process.env.OANDA_API_KEY || "YOUR_OANDA_API_KEY";
const ACCOUNT_ID = process.env.ACCOUNT_ID || "YOUR_OANDA_ACCOUNT_ID";
const OANDA_URL = "https://api-fxpractice.oanda.com"; // 本番なら api-fxtrade.oanda.com

// === Webhook受信処理 ===
app.post("/webhook", async (req, res) => {
  try {
    const { alert, symbol, units } = req.body;
    console.log("📩 受信:", req.body);

    const instrument = symbol || "USD_JPY"; // 通貨ペア
    const tradeUnits = units || 1000; // ロット数（TradingViewから指定なしなら1000）

    // ====== ロングエントリー ======
    if (alert === "LONG_ENTRY") {
      const order = {
        order: {
          instrument,
          units: tradeUnits, // ロング
          type: "MARKET",
          positionFill: "DEFAULT",
        },
      };

      const r = await axios.post(
        `${OANDA_URL}/v3/accounts/${ACCOUNT_ID}/orders`,
        order,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OANDA_API_KEY}`,
          },
        }
      );

      console.log("✅ ロング注文成功:", r.data);
      return res.status(200).send("Long entry success");
    }

    // ====== ショートエントリー ======
    if (alert === "SHORT_ENTRY") {
      const order = {
        order: {
          instrument,
          units: -tradeUnits, // ショート
          type: "MARKET",
          positionFill: "DEFAULT",
        },
      };

      const r = await axios.post(
        `${OANDA_URL}/v3/accounts/${ACCOUNT_ID}/orders`,
        order,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OANDA_API_KEY}`,
          },
        }
      );

      console.log("✅ ショート注文成功:", r.data);
      return res.status(200).send("Short entry success");
    }

    // ====== ロング決済 ======
    if (alert === "LONG_EXIT_ZLSMA" || alert === "CH_SELL") {
      const closeEndpoint = `${OANDA_URL}/v3/accounts/${ACCOUNT_ID}/positions/${instrument}/close`;
      const data = { longUnits: "ALL" };

      const r = await axios.put(closeEndpoint, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OANDA_API_KEY}`,
        },
      });

      console.log("💰 ロング決済成功:", r.data);
      return res.status(200).send("Long close success");
    }

    // ====== ショート決済 ======
    if (alert === "SHORT_EXIT_ZLSMA" || alert === "CH_BUY") {
      const closeEndpoint = `${OANDA_URL}/v3/accounts/${ACCOUNT_ID}/positions/${instrument}/close`;
      const data = { shortUnits: "ALL" };

      const r = await axios.put(closeEndpoint, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OANDA_API_KEY}`,
        },
      });

      console.log("💰 ショート決済成功:", r.data);
      return res.status(200).send("Short close success");
    }

    console.log("⚠️ 不明なalert:", alert);
    res.status(400).send("Unknown alert type");
  } catch (error) {
    console.error("❌ エラー:", error.response?.data || error.message);
    res.status(500).send("Server error");
  }
});

// === サーバー起動 ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
