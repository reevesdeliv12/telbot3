Build a simple working Telegram cryptocurrency wallet demo using **Node.js + TypeScript**.

This is only a demo for approximately **50 users maximum**, so prioritize:

- simplicity
- fast setup
- minimal dependencies
- easy installation
- easy local development

Do NOT use:

- Prisma
- PostgreSQL
- MySQL
- MongoDB
- Docker
- Redis

Use a simple persistent local JSON database instead.

Use either:

- `lowdb`

or, if even simpler, directly read/write:

`data/db.json`

The database must persist when the bot restarts.

---

# MAIN GOAL

Build a Telegram bot where:

1. A user sends `/start`
2. The bot registers the Telegram user
3. The system assigns the user unique cryptocurrency wallet addresses
4. The wallets are deterministically derived from master HD wallet seed phrases
5. The user receives addresses for:
   - Ethereum
   - BNB Smart Chain
   - Solana
6. `/wallet` shows the addresses and their current blockchain balances
7. The application monitors those wallets
8. When ETH, BNB, or SOL is deposited, the Telegram user receives a notification
9. Deposits must not generate duplicate notifications

Do NOT implement withdrawals yet.

Do NOT implement trading yet.

Do NOT implement USDT, USDC, ERC-20, BEP-20, or SPL tokens yet.

Only native:

- ETH
- BNB
- SOL

---

# TECHNOLOGY

Use:

- Node.js
- TypeScript
- ethers
- @solana/web3.js
- a suitable BIP39/Ed25519 derivation package for Solana
- Telegraf for Telegram
- lowdb or simple JSON filesystem persistence
- dotenv
- zod if useful for environment validation

Avoid unnecessary dependencies.

---

# TELEGRAM REGISTRATION

When someone sends:

`/start`

get their:

- Telegram user ID
- Telegram chat ID
- username
- first name
- last name

Check `db.json`.

If the Telegram user already exists:

DO NOT generate new wallet addresses.

Show their existing account.

If they do not exist:

1. allocate a unique sequential wallet index
2. derive their EVM wallet
3. derive their Solana wallet
4. save everything
5. send their wallet information

Example response:

```
👋 Welcome to Copy Entries

Your account has been created successfully.

💰 Your Deposit Wallets

Ethereum
0x123...

BNB Smart Chain
0x123...

Solana
8Hgf...

Use /wallet to view your balances.
```

---

# EVM HD WALLET

Use a single master EVM mnemonic stored in:

`EVM_MASTER_MNEMONIC`

Never hardcode the mnemonic.

Use `ethers`.

Derive addresses using:

`m/44'/60'/0'/0/index`

For example:

User index 0:

`m/44'/60'/0'/0/0`

User index 1:

`m/44'/60'/0'/0/1`

User index 2:

`m/44'/60'/0'/0/2`

Ethereum and BNB Smart Chain are EVM compatible.

Therefore the same derived EVM address can be used for:

Ethereum

and

BNB Smart Chain.

Example:

```
ETH:
0xABC123...

BNB:
0xABC123...
```

They are the same address but used on different networks.

Do NOT store the derived private key inside `db.json`.

Store:

- address
- derivation index

The private key should be reproducible from:

- master mnemonic
- derivation index

Never show private keys through Telegram.

---

# SOLANA HD WALLET

Use:

`SOLANA_MASTER_MNEMONIC`

Derive a unique Solana Ed25519 keypair for each wallet index.

Use a standard deterministic Solana derivation scheme.

For example conceptually:

```
User 0 → Solana index 0
User 1 → Solana index 1
User 2 → Solana index 2
```

Store only:

- public address
- derivation index

Do NOT store the secret/private key inside `db.json`.

Never send the Solana private key through Telegram.

---

# SIMPLE JSON DATABASE

Create:

```
data/
   db.json
```

Structure it approximately like:

```json
{
  "nextWalletIndex": 3,

  "users": [
    {
      "id": "telegram-user-id",
      "telegramUserId": "123456789",
      "telegramChatId": "123456789",
      "username": "example",
      "firstName": "John",
      "walletIndex": 0,

      "wallets": {
        "ethereum": {
          "address": "0x123..."
        },

        "bnb": {
          "address": "0x123..."
        },

        "solana": {
          "address": "ABCDEFG..."
        }
      },

      "createdAt": "..."
    }
  ],

  "deposits": [],

  "checkpoints": {
    "ethereum": null,
    "bnb": null,
    "solana": null
  }
}
```

You may improve the structure if necessary.

Keep it simple.

---

# WALLET INDEX ALLOCATION

Use:

`nextWalletIndex`

When registering a new user:

1. read current `nextWalletIndex`
2. assign that index to the user
3. increment `nextWalletIndex`
4. save the JSON database

Example:

```
nextWalletIndex = 0

User A → index 0

nextWalletIndex = 1

User B → index 1

nextWalletIndex = 2
```

Do not determine wallet indexes using:

`users.length`

because that could eventually cause duplicate derivation indexes.

---

# /WALLET COMMAND

Create:

`/wallet`

Show:

### Ethereum

Address

Current ETH balance

### BNB Smart Chain

Address

Current BNB balance

### Solana

Address

Current SOL balance

Example:

```
💰 My Wallet

🔷 Ethereum

0xABC...

Balance:
0.025 ETH


🟡 BNB Smart Chain

0xABC...

Balance:
1.20 BNB


🟣 Solana

7HF...

Balance:
3.45 SOL
```

Balances must come directly from blockchain RPC.

Do NOT calculate wallet balance from the deposit database.

---

# ETH BALANCE

Use:

`ETH_RPC_URL`

and ethers:

`provider.getBalance(address)`

Convert wei to ETH using the appropriate ethers function.

Never use JavaScript floating-point arithmetic for blockchain base units.

---

# BNB BALANCE

Use:

`BNB_RPC_URL`

Use an ethers JSON RPC provider.

Call:

`provider.getBalance(address)`

Convert wei to BNB.

---

# SOLANA BALANCE

Use:

`SOLANA_RPC_URL`

Use:

`@solana/web3.js`

Call:

`connection.getBalance(publicKey)`

Convert lamports to SOL.

---

# DEPOSIT MONITOR

Create a background deposit monitoring service.

The bot and deposit monitor can run in the SAME Node.js process for this demo.

There is no need for Redis, queues, microservices, or worker infrastructure.

Structure it cleanly though.

Example:

```
Telegram Bot
     |
     |
Node Application
     |
     +------ Telegram handlers
     |
     +------ ETH monitor
     |
     +------ BNB monitor
     |
     +------ SOL monitor
     |
     +------ db.json
```

---

# SIMPLE MONITORING APPROACH

Because there are only approximately 50 users, prioritize simplicity instead of building a large blockchain indexing system.

Use polling.

Example:

Every approximately:

`10-20 seconds`

check blockchain progress and find new transactions.

Make the interval configurable:

```
MONITOR_INTERVAL_MS=15000
```

Do not make unnecessary RPC requests.

---

# ETHEREUM MONITOR

Maintain:

`lastProcessedBlock`

inside:

`db.json`

For example:

```json
"checkpoints": {
    "ethereum": 12345678
}
```

On startup:

If no checkpoint exists:

set it to the current blockchain block.

Do NOT scan the entire Ethereum blockchain.

After that:

periodically:

1. get latest block
2. process blocks after `lastProcessedBlock`
3. inspect transactions
4. check whether `transaction.to` matches one of our registered ETH addresses
5. check that transaction value > 0
6. record the deposit
7. wait for configured confirmations
8. send Telegram notification
9. update checkpoint

Use:

`ETH_CONFIRMATIONS`

For demo/testnet use a sensible small value.

---

# BNB MONITOR

Implement essentially the same monitoring system.

Use:

`BNB_RPC_URL`

Maintain:

`checkpoints.bnb`

Process new blocks.

Check native BNB transactions where:

`transaction.to`

matches one of our registered BNB addresses.

Record the deposit.

After sufficient confirmations:

send Telegram notification.

Use:

`BNB_CONFIRMATIONS`.

---

# SOLANA MONITOR

For Solana keep the implementation simple.

Maintain a record of already-seen transaction signatures.

For every registered Solana wallet:

periodically retrieve recent signatures using the Solana RPC.

Use:

`getSignaturesForAddress`

Only inspect signatures that have not already been processed.

Retrieve transaction information.

Determine whether the wallet received native SOL.

Calculate the difference in wallet balance using transaction metadata if necessary.

Ignore outgoing-only transactions.

If incoming SOL is detected:

1. save transaction signature
2. save deposit amount
3. mark it detected
4. wait for appropriate commitment status
5. send Telegram notification

Do not scan unlimited transaction history.

Only inspect a reasonable number of recent signatures.

---

# DEPOSIT RECORD

Store deposits in `db.json`.

Example:

```json
{
    "id": "ethereum:0xABC123",
    "telegramUserId": "123456",
    "chain": "ethereum",
    "symbol": "ETH",
    "txHash": "0xABC123",
    "from": "0x...",
    "to": "0x...",
    "amount": "0.5",
    "status": "confirmed",
    "notified": true,
    "detectedAt": "...",
    "confirmedAt": "..."
}
```

For Solana:

`txHash`

can contain the transaction signature.

Create the deposit ID using:

Ethereum:

`ethereum:${txHash}`

BNB:

`bnb:${txHash}`

Solana:

`solana:${signature}`

Before processing a transaction:

check whether that deposit ID already exists.

If it exists:

DO NOT create another deposit.

DO NOT send another notification.

---

# TELEGRAM NOTIFICATION

When a deposit is confirmed:

find the Telegram owner using the destination wallet.

Send a message.

Ethereum example:

```
✅ Deposit Confirmed

You received:

0.250 ETH

Network:
Ethereum

From:
0xABC...

Transaction:
0xDEF...

Your new ETH balance:
0.750 ETH
```

BNB example:

```
✅ Deposit Confirmed

You received:

1.50 BNB

Network:
BNB Smart Chain

Transaction:
0x...
```

Solana example:

```
✅ Deposit Confirmed

You received:

2.50 SOL

Network:
Solana

Transaction:
5Ghf...
```

After the Telegram API successfully sends the message:

set:

`notified: true`

in `db.json`.

---

# DUPLICATE NOTIFICATION PROTECTION

This is important.

If the application restarts:

DO NOT notify users again about already-notified deposits.

Before sending a notification check:

`deposit.notified`

If:

`true`

do nothing.

Also identify transactions uniquely using:

`chain + transaction hash/signature`.

---

# TELEGRAM COMMANDS

Implement:

`/start`

Register or show existing account.

`/wallet`

Show wallet addresses and blockchain balances.

`/help`

Show:

```
Available Commands

/start - Start the bot
/wallet - View your wallets and balances
/help - View help
```

Do not implement `/withdraw` yet.

If `/withdraw` is entered:

respond:

```
Withdrawals are not available in this demo yet.
```

---

# ENVIRONMENT VARIABLES

Create:

`.env.example`

containing:

```env
TELEGRAM_BOT_TOKEN=

EVM_MASTER_MNEMONIC=
SOLANA_MASTER_MNEMONIC=

ETH_RPC_URL=
BNB_RPC_URL=
SOLANA_RPC_URL=

ETH_CONFIRMATIONS=2
BNB_CONFIRMATIONS=2

MONITOR_INTERVAL_MS=15000

NODE_ENV=development
```

Do NOT commit the real `.env`.

Add:

`.env`

to:

`.gitignore`

---

# SECURITY

Even though this is a demo, follow basic security practices.

Never:

- print mnemonic phrases
- print private keys
- send mnemonic through Telegram
- send private keys through Telegram
- store private keys in `db.json`
- commit `.env`
- expose an API that returns private keys

The master mnemonic controls all derived wallets.

Add an obvious warning to the README:

```
DEMO SOFTWARE.

Do not use significant real funds.

Anyone who obtains the master mnemonic can control every derived wallet.
```

---

# PROJECT STRUCTURE

Keep it simple:

```text
src/
    index.ts

    bot/
        bot.ts
        start.ts
        wallet.ts
        help.ts

    wallets/
        evm.ts
        solana.ts

    chains/
        ethereum.ts
        bnb.ts
        solana.ts

    monitors/
        ethereumMonitor.ts
        bnbMonitor.ts
        solanaMonitor.ts

    services/
        userService.ts
        depositService.ts
        notificationService.ts

    db/
        database.ts

    config/
        env.ts

data/
    db.json

.env.example
.gitignore
package.json
tsconfig.json
README.md
```

Do not over-engineer the project.

---

# DATABASE SERVICE

Create simple helper functions such as:

```typescript
getUserByTelegramId()

createUser()

getAllUsers()

getWalletOwner()

getNextWalletIndex()

saveDeposit()

getDepositById()

markDepositConfirmed()

markDepositNotified()

getCheckpoint()

setCheckpoint()
```

Centralize JSON reading/writing.

Do not have every file independently manipulate `db.json`.

---

# FILE WRITE SAFETY

Since multiple monitoring loops may update `db.json`, prevent simultaneous writes from corrupting the file.

Implement a simple in-process write lock/mutex or sequential write queue.

Use atomic writes where practical:

1. write temporary file
2. rename temporary file to `db.json`

For this single-process demo this is sufficient.

---

# TEST NETWORK SUPPORT

Make the application work with whichever RPC URLs are provided.

This means I should be able to use:

Ethereum testnet

BNB Smart Chain testnet

Solana devnet

during development.

Do not hardcode mainnet URLs.

---

# TESTING GOAL

When finished I should be able to:

1. run `npm install`
2. copy `.env.example` to `.env`
3. add Telegram bot token
4. add EVM mnemonic
5. add Solana mnemonic
6. add RPC URLs
7. run the app
8. open Telegram
9. send `/start`
10. receive ETH, BNB and SOL addresses
11. send `/wallet`
12. see blockchain balances
13. send test ETH to the ETH address
14. receive a Telegram ETH deposit notification
15. send test BNB to the BNB address
16. receive a Telegram BNB notification
17. send test SOL to the SOL address
18. receive a Telegram SOL notification
19. restart the application
20. verify old transactions do NOT generate duplicate alerts

---

# IMPORTANT CODEX INSTRUCTIONS

Do not just explain the implementation.

Actually create the complete working application.

Start by inspecting the current repository.

If it is empty, initialize the Node.js + TypeScript project.

Work incrementally.

After implementation:

1. run `npm install`
2. run TypeScript compilation
3. fix compilation errors
4. run any tests
5. fix failures
6. verify the application starts
7. provide clear setup instructions

Do NOT add Prisma.

Do NOT add Docker.

Do NOT add a complex database.

Do NOT add unnecessary architecture.

Do NOT implement withdrawals.

Do NOT implement trading.

Do NOT implement tokens.

Keep this version focused on:

**Telegram registration → HD wallets → balances → deposit detection → Telegram notifications.**