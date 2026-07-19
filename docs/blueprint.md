# TradingView Alert Notifier — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

Receives XAU/USD TradingView alerts via webhook and delivers them as immediate messages to private Telegram chats with optional custom prefixes and delivery confirmation.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- traders
- financial analysts

## Success criteria

- Alerts from TradingView are delivered to Telegram within 1 second of receipt
- 100% command success rate for /start, /status, and /stop commands

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Register chat and generate webhook URL
- **/setprefix** (command, actor: user, command: /setprefix) — Set custom prefix for all alerts
- **/status** (command, actor: user, command: /status) — Show last 10 alerts and delivery status
- **/stop** (command, actor: user, command: /stop) — Unregister chat from alert subscriptions

## Flows

### Alert delivery
_Trigger:_ Webhook POST from TradingView

1. Receive JSON payload
2. Extract message/symbol/time
3. Format with prefix
4. Send to Telegram chat
5. Return HTTP status code

_Data touched:_ Alert, Subscription

### Owner setup
_Trigger:_ /start

1. Verify new chat
2. Generate unique token
3. Store chat ID mapping
4. Return webhook URL

_Data touched:_ User, Subscription

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram account with alert preferences
  - fields: telegram_chat_id, prefix
- **Alert** _(retention: persistent)_ — Incoming TradingView alert payload
  - fields: timestamp, symbol, message, custom_fields
- **Subscription** _(retention: persistent)_ — Webhook token to Telegram mapping
  - fields: webhook_token, telegram_chat_id

## Integrations

- **Telegram** (required) — Bot API messaging
- **HTTP Webhook** (required) — TradingView alert endpoint
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- /start registration
- /setprefix customization
- /status monitoring
- /stop deregistration

## Notifications

- Telegram messages with formatted TradingView alerts
- Delivery confirmation responses to webhook requests

## Permissions & privacy

- Webhook tokens are unguessable and scoped to single chats
- No PII stored beyond Telegram chat IDs

## Edge cases

- Invalid webhook tokens
- Malformed TradingView payloads
- Telegram chat deactivation

## Required tests

- End-to-end alert delivery from TradingView to Telegram
- Command handling for all four / commands
- Token regeneration on /stop

## Assumptions

- TradingView webhook format includes 'text' or 'message' field
- One-to-one webhook-to-Telegram mapping by default
- Immediate delivery without batching
