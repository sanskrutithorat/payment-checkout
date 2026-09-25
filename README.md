# Dodo Checkout

Dodo Checkout is a small, polished, embeddable checkout application designed to demonstrate strong frontend engineering, UX, TypeScript, and architecture skills.

## Overview
Dodo Checkout simulates a modern payment flow. It features three conceptually separated pieces:
1. **Demo merchant (`DemoApp.tsx`)**: The host website selling a product.
2. **SDK (`DodoCheckout.ts`)**: A framework-agnostic script the merchant integrates.
3. **Checkout app (`CheckoutApp.tsx`)**: The secure, isolated iframe application hosted by the payment provider.

## Architecture
The project is built around a secure boundary architecture separating the host website from sensitive payment forms.

**Flow:**
`Merchant` -> `SDK` -> `iframe` -> `Checkout App`
`Checkout App` -> `postMessage` -> `SDK` -> `callbacks` -> `Merchant`

### Data Isolation
Sensitive payment fields (card number, CVV, expiry, email) **never** leave the iframe. The SDK strictly receives only high-level status events (like `PAYMENT_SUCCESS`, `PAYMENT_ERROR`, `CLOSE`), ensuring complete security and data isolation for the merchant.

### Environment Variables
For convenience in this codebase, the project is deployed as a single application, so both the demo page and checkout are served from the same origin (e.g., using Vite locally). However, conceptually and in production, they are intended to be deployed separately:
1. **Demo Application**: Hosted by the merchant (e.g., `https://merchant-demo.example`).
2. **Checkout Application**: Hosted by the payment provider (e.g., `https://checkout-provider.example`).

To point the SDK to the checkout provider's origin, you must set `VITE_CHECKOUT_ORIGIN` in your `.env` file (see `.env.example`).
```env
VITE_CHECKOUT_ORIGIN=https://your-checkout-domain.vercel.app
```
For local development, the `.env` file should point to the local Vite server (e.g., `http://localhost:5174`).

## Running Locally

To run the project locally, follow these steps:

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`. 

## Test Cards

You can use the following test cards to verify different payment behaviors. 

| Scenario | Card Number | Expected Behavior |
|----------|-------------|-------------------|
| **Success** | `4242 4242 4242 4242` | Simulates a successful payment. |
| **Declined** | `4000 0000 0000 0002` | Fails with a card declined error. User can retry. |
| **Fail once, succeed** | `4000 0000 0000 0341` | First attempt fails. Second attempt succeeds. |

Any other card will produce a generic "Invalid test card" error.

## SDK API

The SDK provides a simple, framework-agnostic API for merchants.

```typescript
DodoCheckout.open({
  // Unique product identifier to checkout
  productId: "prod_123",
  
  // Called when payment completes successfully
  onSuccess: ({ sessionId }) => {
    console.log('Payment successful. Session:', sessionId);
  },
  
  // Called when checkout UI closes (either user initiated or unrecoverable error)
  onClose: ({ reason }) => {
    console.log('Checkout closed by:', reason);
  },
  
  // Called when payment fails, allowing the host to log or react
  onError: ({ code, message }) => {
    console.error('Payment error:', code, message);
  }
});
```

## Edge Cases Handled
- **Duplicate Buy clicks:** The SDK ignores repeated `open()` calls if the checkout is already open. The Demo app also disables the buy button while active.
- **Duplicate Pay clicks:** The checkout form disables the submit button while processing.
- **Payment failures:** Checkout stays open and allows the user to retry gracefully.
- **Retry logic:** The `0341` card fails on the first attempt but guarantees success on the second.
- **Iframe load failure:** The SDK waits up to 10 seconds for the iframe to broadcast a `READY` message. If it times out, it closes safely and throws an error.
- **Unexpected postMessage:** The SDK explicitly validates both the `event.origin` and `event.source === iframe.contentWindow`, completely ignoring spoofed or unintended messages.
- **Cleanup:** When the checkout closes, the SDK removes DOM nodes, clears timeouts, and unbinds event listeners to prevent memory leaks.

## Design Decisions

### Decision 1: Iframe + postMessage Isolation
Isolating the checkout in an iframe is an industry-standard security measure. It ensures that the host website cannot read the sensitive cardholder data typed by the user. By tightly coupling this with explicit `postMessage` origin and source validation, we protect against XSS attacks from the host page and prevent malicious cross-window communication.

### Decision 2: SDK ↔ Iframe Communication Handshake
To ensure secure communication, the SDK and iframe perform a strict initialization handshake:
1. **SDK sends `INIT`**: Once the iframe loads, the SDK sends an `INIT` message to the iframe using the exact checkout origin.
2. **Checkout verifies parent**: The checkout iframe listens for the `INIT` message, verifying `event.source === window.parent`.
3. **Checkout stores trusted origin**: The checkout stores the parent's `event.origin` as the `trustedParentOrigin`.
4. **Checkout sends `READY`**: The checkout sends a `READY` message back to the `trustedParentOrigin`, strictly avoiding the use of `*` for the target origin.
5. **Ongoing communication**: All subsequent messages (e.g., `PAYMENT_SUCCESS`, `PAYMENT_ERROR`, `CLOSE`) from the checkout are sent strictly to the `trustedParentOrigin`.

### Decision 3: Callback Lifecycle
The callback lifecycle is explicitly designed to be unambiguous. 
- `onSuccess` strictly means the payment succeeded.
- `onClose` strictly means the UI was dismissed (either by the user, or an error). 
We specifically **avoid** calling `onClose({ reason: 'success' })` after `onSuccess` has already fired, as it forces the merchant to write confusing double-handling logic. If `onSuccess` fires, the merchant knows the flow succeeded and the UI will automatically vanish.

## What I would explore next

Since this is a simulated assignment, there are many avenues for a production-ready evolution:

1. **Real payment provider integration:** Hooking up a real processor backend to tokenize the card directly from the iframe.
2. **Server-side payment/session creation:** Having the merchant create an intent session on their backend first, and passing a `client_secret` to the SDK instead of a static `productId`.
3. **Stronger origin/session validation:** Validating the SDK's host domain explicitly against an allowed list on the iframe provider's backend.
4. **CSP/security headers:** Enforcing `frame-ancestors` and strict Content Security Policies.
5. **Payment status reconciliation/webhooks:** Using webhooks to securely confirm payment completion asynchronously rather than trusting client-side `onSuccess` signals.
6. **Better analytics/observability:** Implementing Datadog/Sentry tracing across the iframe boundary to trace drop-offs or network communication failures.
7. **Localization:** Adding generic string localization based on browser locale.
8. **More extensive automated tests:** Adding comprehensive E2E tests (Playwright/Cypress) to verify iframe isolation and accessibility navigation.
