# Hermes: Solana Swap Alert Bot 🔔

Hermes is a lightweight Telegram bot that monitors specific Solana wallet addresses for on-chain SWAP activity and sends real-time alerts when tokens are bought or sold. It integrates the Helius API for blockchain monitoring and Dexscreener for token metadata like name, symbol, and market cap.

---

## 📦 Features

- 🛰 Tracks SWAP transactions on Solana in near real-time
- 🪙 Resolves token name, symbol, and market cap via Dexscreener
- 💬 Sends clean, readable messages to Telegram chats
- 📉 Includes chart link to Dexscreener per token
- 🧪 `TEST_RUN` mode for local testing without spamming Telegram

---

## 🛠️ Setup

### 1. Clone the repo and install dependencies

```bash
git clone https://github.com/yourname/hermes-solana-bot.git
cd hermes-solana-bot
npm install
```

### 2. Create `.env` file

Create a `.env` file in the root of the project:

```env
# Set to true for testing (no Telegram messages sent)
TEST_RUN=true

# Your Helius API key (get from helius.xyz)
API_KEY=your_helius_api_key

# Telegram bot token from @BotFather
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Comma-separated list of Telegram user/chat IDs to send TG messages to
CHAT_IDS=111111111,222222222,333333333

# JSON map of wallet addresses to human-readable labels
ADDRESSES_MAP={
  "PocketWatchingWalletAddress1": "Name1",
  "PocketWatchingWalletAddress2": "Name2"
}
```

> 🧠 `.env` is ignored by Git — do **not** commit secrets.

### 3. Run the bot

```bash
node index.js
```

The bot will begin polling for wallet activity every 2 minutes.

---

## 📊 Example Telegram Alert

```
BUY ALERT!
Time(EST)🕒: 04:44 PM
Trader📈: dounbug
6.90 SOL ➡️ 44,230 HOUSECOIN ($HOUSE)
💰 Market Cap: $945,327
📊 Dexscreener: https://dexscreener.com/solana/...
```

---

## 🤝 Contributing

Pull requests and forks welcome. If you’re adding new data sources (like Jupiter or Birdeye fallback), please modularize them under `/utils`.

---

## 🛡 License

MIT — free to use and modify. Give credit if you fork.

---

## 💬 Support

Found a bug or want to suggest a feature? [Open an issue](https://github.com/yourname/hermes-solana-bot/issues).
