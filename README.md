# Telegram ETH-BNB-SOL Wallet Demo

DEMO SOFTWARE.

Do not use significant real funds. Anyone who obtains the master mnemonic can control every derived wallet.

This is a small Telegram bot demo for native ETH, BNB, and SOL deposits. It uses deterministic HD wallet derivation, blockchain RPC polling, and a persistent local JSON database at `data/db.json`.

## Features

- `/start` registers a Telegram user and assigns deterministic ETH, BNB, and SOL deposit addresses.
- `/wallet` shows current balances directly from configured blockchain RPC URLs.
- `/connect` shows seed phrase/private key/public address options, warns users not to share secrets, accepts the next text entry, and redacts secret-method submissions before storage.
- `/buy` opens the wallet screen for the demo trade/funding flow.
- `/help` lists available commands.
- `/withdraw` lets a user choose ETH, BNB, or SOL, enter a destination address, and records a pending withdrawal request.
- `/admin` opens a password-protected read-only admin panel for stored local JSON data.
- ETH and BNB deposits are detected by polling confirmed EVM blocks.
- SOL deposits are detected by polling recent wallet signatures.
- Deposits are stored by `chain:txHash`, so already-notified deposits do not alert again after restart.

## Requirements

- Node.js 20 or newer
- A Telegram bot token from BotFather
- Testnet/devnet RPC URLs:
  - Ethereum testnet RPC, such as Sepolia
  - BNB Smart Chain testnet RPC
  - Solana devnet RPC
- Two BIP39 mnemonic phrases:
  - one for EVM wallets
  - one for Solana wallets

## Install

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

EVM_MASTER_MNEMONIC="test test test test test test test test test test test junk"
SOLANA_MASTER_MNEMONIC="test test test test test test test test test test test junk"

ETH_RPC_URL=https://your-ethereum-testnet-rpc
BNB_RPC_URL=https://your-bnb-testnet-rpc
SOLANA_RPC_URL=https://api.devnet.solana.com

ETH_CONFIRMATIONS=2
BNB_CONFIRMATIONS=2
MONITOR_INTERVAL_MS=60000
SOLANA_SIGNATURE_LIMIT=5

ADMIN_PASSWORD=change-this-admin-password

NODE_ENV=development
```

Use fresh demo mnemonics only. Do not reuse a real wallet seed phrase.

## Run

Development:

```bash
npm run dev
```

Production-style local run:

```bash
npm run build
npm start
```

## Test In Telegram

1. Open your Telegram bot.
2. Send `/start`.
3. Confirm the bot replies with Ethereum, BNB Smart Chain, and Solana addresses.
4. Send `/wallet`.
5. Confirm balances load from the configured RPC URLs.
6. Send test ETH to the Ethereum address.
7. Wait for the configured confirmations and polling interval.
8. Confirm you receive an ETH deposit notification.
9. Send test BNB to the BNB address and confirm a BNB notification.
10. Send devnet SOL to the Solana address and confirm a SOL notification.
11. Stop the app with `Ctrl+C`.
12. Start it again with `npm run dev`.
13. Confirm old deposits do not send duplicate Telegram alerts.

## Database

The JSON database lives at:

```text
data/db.json
```

It stores Telegram user records, public deposit addresses, derivation indexes, checkpoints, and deposit notification state. It does not store private keys or mnemonics.
It also stores pending withdrawal requests in `withdrawals` and connect-flow records in `connectedWallets`. The demo does not automatically send funds.

## Admin Panel

Set this in `.env`:

```env
ADMIN_PASSWORD=your-local-admin-password
```

Restart the bot, then send:

```text
/admin
```

Enter the password. The panel has buttons for summary, users, deposits, withdrawals, connected wallets, and the full stored JSON.

The admin panel only reads `data/db.json`. It does not show `.env`, mnemonics, Telegram token, or private keys.

To reset the demo, stop the app and replace `data/db.json` with:

```json
{
  "nextWalletIndex": 0,
  "users": [],
  "deposits": [],
  "withdrawals": [],
  "connectedWallets": [],
  "checkpoints": {
    "ethereum": null,
    "bnb": null,
    "solana": null
  }
}
```

## Wallet Derivation

EVM addresses use:

```text
m/44'/60'/0'/0/index
```

The same EVM address is shown for Ethereum and BNB Smart Chain.

Solana addresses use:

```text
m/44'/501'/index'/0'
```

Only public addresses and wallet indexes are persisted.

## Notes

- This demo polls whole EVM blocks, which is acceptable for a small testnet demo but not for a production wallet system.
- Public free RPC URLs can rate-limit with `429 Too Many Requests`. Use a private/free-tier RPC provider if this happens often.
- The app does not implement withdrawals, trading, USDT, USDC, ERC-20, BEP-20, or SPL tokens.
- Withdrawal requests are recorded as pending admin/operator work items only. No private keys are used for withdrawals and no blockchain transaction is sent.
- `/connect` never stores seed phrases or private keys. For seed/private-key selections, it stores only redacted behavior metadata such as character count and word count.
- Keep `.env` private. It contains mnemonics that control every derived wallet.
