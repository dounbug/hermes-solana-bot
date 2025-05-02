const { SYSVAR_EPOCH_SCHEDULE_PUBKEY } = require("@solana/web3.js");
require('dotenv').config();

//Get environment values
const TEST_RUN = (process.env.TEST_RUN ?? 'false') === 'true';
const API_KEY = process.env.API_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const chatIds = process.env.CHAT_IDS.split(',');
const addressesMap = JSON.parse(process.env.ADDRESSES_MAP);

const TX_FETCH_LIMIT = 10; // or 25, 50, 100

let lastTransactionMap = {};
const tokenNameCache = {};

// 🟩 ENTRY POINTF
const pollTransactions = async () => {
  while (true) {
    for (const [address, name] of Object.entries(addressesMap)) {
      console.log(`Checking transactions for ${name} (${address})...`);
      await fetchTransactionsForAddress(address, name);
    }
    await sleep(120000); // every 2 min
  }
};

// 🟦 FETCH + FILTER
const fetchTransactionsForAddress = async (address, name) => {
  const fetchURL = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${API_KEY}&type=SWAP&limit=${TX_FETCH_LIMIT}`;

  try {
    const response = await fetch(fetchURL);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    if (!lastTransactionMap[address] && !TEST_RUN) {
      lastTransactionMap[address] = data[0].signature;
      return;
    }

    const newTransactions = [];
    for (const tx of data) {
      if (tx.signature === lastTransactionMap[address]) break;
      newTransactions.push(tx);
    }

    if (newTransactions.length > 0) {
      console.log(`📬 ${newTransactions.length} new transactions for ${name}`);
      newTransactions.reverse();
      for (const tx of newTransactions) {
        await parseTransaction(tx, name);
      }
      lastTransactionMap[address] = data[0].signature;
    }
  } catch (error) {
    console.error(`Error fetching transactions for ${name}:`, error);
  }
};

// 🟨 PARSE + FORMAT
const parseTransaction = async (transaction) => {
  const tokenTransfers = transaction.tokenTransfers || [];
  const accountData = transaction.accountData || [];

  if (tokenTransfers.length < 1 && accountData.length < 1) {
    console.error('No useful transfer detected.');
    return;
  }

  const readableTime = new Date(transaction.timestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const outgoingToken = tokenTransfers.find(t => addressesMap[t.fromUserAccount]);
  const incomingToken = tokenTransfers.find(t => addressesMap[t.toUserAccount]);

  if (!outgoingToken && !incomingToken) {
    console.error('No token transfers from watched address.');
    return;
  }

  const userAddress = outgoingToken?.fromUserAccount || incomingToken?.toUserAccount;
  const senderName = addressesMap[userAddress] || 'Unknown';
  const userAccountData = accountData.find(a => a.account === userAddress);

  if (!userAccountData) {
    console.error('No accountData found for this user.');
    return;
  }

  const solChange = userAccountData.nativeBalanceChange / 1e9;

  let alertType, tokenAmount, solAmount, tokenSymbol, tokenMint, tokenName;

  if (outgoingToken && solChange > 0) {
    // SELL
    alertType = 'SELL ALERT!';
    tokenAmount = formatAmount(outgoingToken.tokenAmount);
    solAmount = formatAmount(solChange);
    tokenMint = outgoingToken.mint;

    ({ name: tokenName, symbol: tokenSymbol } = await getTokenNameFromMint(tokenMint));
  } else if (incomingToken && solChange < 0) {
    // BUY
    alertType = 'BUY ALERT!';
    tokenAmount = formatAmount(incomingToken.tokenAmount);
    solAmount = formatAmount(Math.abs(solChange));
    tokenMint = incomingToken.mint;

    ({ name: tokenName, symbol: tokenSymbol } = await getTokenNameFromMint(tokenMint));
  } else {
    console.error('Could not classify swap.');
    return;
  }

  const message = buildMessage({
    alertType,
    senderName,
    solAmount,
    tokenAmount,
    tokenName,
    tokenSymbol,
    readableTime,
    tokenMint,
    reverse: alertType === 'SELL ALERT!'
  });

  if (TEST_RUN) {
    console.log(`(TEST RUN) Telegram message:\n${message}`);
  } else {
    await sendTelegramMessage(message);
  }
};

// 🟦 MESSAGING
const buildMessage = ({ alertType, senderName, solAmount, tokenAmount, tokenName, tokenSymbol, readableTime, tokenMint, reverse }) => {
  const chartURL = `https://dexscreener.com/solana/${tokenMint}`;

  const line = reverse
    ? `${tokenAmount} ${tokenName} ($${tokenSymbol}) ➡️ ${solAmount} SOL`
    : `${solAmount} SOL ➡️ ${tokenAmount} ${tokenName} ($${tokenSymbol})`;

  return `${alertType}
Time🕒: ${readableTime}
Trader📈: ${senderName}
${line}
📊 [Dexscreener](${chartURL})`;
};

const sendTelegramMessage = async (message) => {
  for (const chatId of chatIds) {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: true  //Change if you want preview of Dexscreener link
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!data.ok) {
        console.error(`Error sending message to ${chatId}:`, data.description);
      } else {
        console.log(`Message sent successfully to ${chatId}!`);
      }
    } catch (error) {
      console.error(`Failed to send message to ${chatId}:`, error);
    }
  }
};

// 🛠 UTILS
const getTokenNameFromMint = async (mint) => {
  if (tokenNameCache[mint]) return tokenNameCache[mint];

  // Handle native SOL
  if (mint.startsWith('So1')) {
    const result = { name: 'Solana', symbol: 'SOL' };
    tokenNameCache[mint] = result;
    return result;
  }

  let name = mint;
  let symbol = '';

  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${mint}`);
    const data = await res.json();
    const token = data?.pairs?.[0]?.baseToken;
    if (token?.name) name = token.name;
    if (token?.symbol) symbol = token.symbol.toUpperCase();
  } catch (err) {
    console.error(`Dexscreener lookup failed for ${mint}:`, err);
  }

  const result = { name, symbol };
  tokenNameCache[mint] = result;
  return result;
};

const formatAmount = (amount) =>
  Number(amount).toLocaleString(undefined, { maximumFractionDigits: 6 });

const sleep = (ms) =>
  new Promise(resolve => setTimeout(resolve, ms));

pollTransactions();
