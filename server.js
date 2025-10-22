import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const OANDA_API_KEY = process.env.OANDA_API_KEY || "YOUR_OANDA_API_KEY";
const ACCOUNT_ID = process.env.ACCOUNT_ID || "YOUR_OANDA_ACCOUNT_ID";
const OANDA_URL = "https://api-fxpractice.oanda.com";

const TRADE_UNITS = 20000; // ロット固定

// 簡易ポジション管理
let positions = {}; // { USD_JPY: { side, entryPrice, sl, tp } }

// 現在価格取得
async function getCurrentPrice(instrument) {
  const r = await axios.get(`${OANDA_URL}/v3/accounts/${ACCOUNT_ID}/pricing?instruments=${instrument}`, {
    headers: { Authorization: `Bearer ${OANDA_API_KEY}` },
  });
  const price = parseFloat(r.data.prices[0].closeoutAsk);
  return price;
}

// ポジション決済
async function closePosition(instrument, side) {
  const data = side === "long" ? { longUnits: "ALL" } : { shortUnits: "ALL" };
  const r = await axios.put(`${OANDA_URL}/v3/accounts/${ACCOUNT_ID}/positions/${instrument}/close`, data, {
    headers: { Authorization: `Bearer ${OANDA_API_KEY}` },
  });
  console.log(`💰 ${side.toUpperCase()}決済成功`, r.data);
  delete positions[instrument];
}

// SL/TP・ZLSMAクロス確認
async function checkPositions() {
  for (const instrument in positions) {
    const pos = positions[instrument];
    const currentPrice = await getCurrentPrice(instrument);

    if (pos.side === "long") {
      // 損切り
      if (currentPrice <= pos.sl) {
        console.log("⚠️ ロング損切り到達");
        await closePosition(instrument, "long");
      }
      // 利確: リスクリワード or ZLSMAクロス
      else if (currentPrice >= pos.tp || pos.zlsmaExit) {
        console.log("✅ ロング利確条件到達");
        await closePosition(instrument, "long");
      }
    } else if (pos.side === "short") {
      if (currentPrice >= pos.sl) {
        console.log("⚠️ ショート損切り到達");
        await closePosition(instrument, "short");
      } else if (currentPrice <= pos.tp || pos.zlsmaExit) {
        console.log("✅ ショート利確条件到達");
        await closePosition(instrument, "short");
      }
    }
  }
}

// Webhook
app.post("/webhook", async (req, res) => {
  try {
    const { alert, symbol, entryPrice, stopLossPrice, takeProfitPrice } = req.body;
    const instrument = symbol || "USD_JPY";

    console.log("📩 受信:", req.body);

    if (alert === "LONG_ENTRY") {
      await axios.post(`${OANDA_URL}/v3/accounts/${ACCOUNT_ID}/orders`, {
        order: { instrument, units: TRADE_UNITS, type: "MARKET", positionFill: "DEFAULT" }
      }, { headers: { Authorization: `Bearer ${OANDA_API_KEY}`, "Content-Type": "application/json" } });

      positions[instrument] = { side: "long", entryPrice, sl: stopLossPrice, tp: takeProfitPrice, zlsmaExit: false };
      console.log("✅ ロングエントリー登録完了");
      return res.status(200).send("Long entry success");
    }

    if (alert === "SHORT_ENTRY") {
      await axios.post(`${OANDA_URL}/v3/accounts/${ACCOUNT_ID}/orders`, {
        order: { instrument, units: -TRADE_UNITS, type: "MARKET", positionFill: "DEFAULT" }
      }, { headers: { Authorization: `Bearer ${OANDA_API_KEY}`, "Content-Type": "application/json" } });

      positions[instrument] = { side: "short", entryPrice, sl: stopLossPrice, tp: takeProfitPrice, zlsmaExit: false };
      console.log("✅ ショートエントリー登録完了");
      return res.status(200).send("Short entry success");
    }

    // ZLSMAクロスでの決済
    if (alert === "LONG_EXIT_ZLSMA" && positions[instrument]?.side === "long") {
      positions[instrument].zlsmaExit = true;
      console.log("🔶 ZLSMAクロス ロング利確フラグ設定");
      return res.status(200).send("Long exit flag set");
    }

    if (alert === "SHORT_EXIT_ZLSMA" && positions[instrument]?.side === "short") {
      positions[instrument].zlsmaExit = true;
      console.log("🔶 ZLSMAクロス ショート利確フラグ設定");
      return res.status(200).send("Short exit flag set");
    }

    res.status(400).send("Unknown alert type");
  } catch (error) {
    console.error("❌ エラー:", error.response?.data || error.message);
    res.status(500).send("Server error");
  }
});

// 10秒ごとにポジションチェック
setInterval(checkPositions, 10000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


