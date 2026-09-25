# Dodo Checkout

Dodo Checkout is a small, polished, embeddable checkout application designed to demonstrate strong frontend engineering, UX, TypeScript, and architecture skills.

## Overview
Dodo Checkout simulates a modern payment flow. It features three conceptually separated pieces:
1. **Demo merchant (`DemoApp.tsx`)**: The host website selling a product.
2. **SDK (`DodoCheckout.ts`)**: A framework-agnostic script the merchant integrates.
3. **Checkout app (`CheckoutApp.tsx`)**: The secure, isolated iframe application hosted by the payment provider.

## Architecture
**Flow:**
`Merchant` -> `SDK` -> `iframe` -> `Checkout App`
`Checkout App` -> `postMessage` -> `SDK` -> `callbacks` -> `Merchant`


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

## Edge Cases Handled
- **Duplicate Buy clicks:** The SDK ignores repeated `open()` calls if the checkout is already open. The Demo app also disables the buy button while active.
- **Duplicate Pay clicks:** The checkout form disables the submit button while processing.
- **Payment failures:** Checkout stays open and allows the user to retry gracefully.
- **Retry logic:** The `0341` card fails on the first attempt but guarantees success on the second.
- **Iframe load failure:** The SDK waits up to 10 seconds for the iframe to broadcast a `READY` message. If it times out, it closes safely and throws an error.
- **Unexpected postMessage:** The SDK explicitly validates both the `event.origin` and `event.source === iframe.contentWindow`, completely ignoring spoofed or unintended messages.
