# Fastion Backend (Shiprocket + Firebase)

## Setup

1. Copy `server/env.example` to `server/.env` and fill real values.
2. Install dependencies:
   - `cd server`
   - `npm install`
3. Start server:
   - `npm run dev`

## Routes

- `GET /health`
- `POST /api/orders` - saves order and attempts Shiprocket sync
- `POST /api/orders/:orderId/sync-shiprocket` - manually sync existing order
- `POST /api/orders/:orderId/generate-label` - generate shipping label
- `POST /api/webhooks/shiprocket` - Shiprocket status webhook

## Notes

- Keep Shiprocket credentials only in backend env.
- Webhook secret is validated via `x-webhook-secret` when configured.
- This uses Firestore Admin SDK and updates the `order` collection by default.
