# Payment Checkout

A small embeddable checkout built with React, TypeScript and Vite.

This project includes a demo store, a small checkout SDK, and a separate checkout page that is loaded inside an iframe. Payments are simulated locally using test card numbers.

## Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd payment-checkout
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
This will start the local server (usually at `http://localhost:5173`). Open it in your browser to see the demo app.

## How to Use

The merchant website integrates the checkout using the SDK (`DodoCheckout.ts`). 

You can open the checkout by calling `DodoCheckout.open()` and passing the required options:

```typescript
import { DodoCheckout } from './sdk/DodoCheckout';

DodoCheckout.open({
  productId: 'prod_123',
  onSuccess: ({ sessionId }) => {
    console.log('Payment successful! Session ID:', sessionId);
  },
  onClose: ({ reason }) => {
    console.log('Checkout closed. Reason:', reason);
  },
  onError: ({ code, message }) => {
    console.error('Payment error:', code, message);
  },
});
```

### Callbacks
- **`onSuccess`**: Triggered when a payment is simulated successfully. Returns a `sessionId`.
- **`onClose`**: Triggered when the checkout iframe is closed by the user or upon successful completion. Returns the `reason` (`"user"`, `"success"`, etc).
- **`onError`**: Triggered when the payment simulation encounters an error. Returns an error `code` and `message`.

## How it works

The architecture consists of three main parts:

- **Demo app** (`src/demo/DemoApp.tsx`) - acts as the merchant website. It has a product and a "Buy Now" button.
- **SDK** (`src/sdk/DodoCheckout.ts`) - creates and manages the checkout iframe and exposes lifecycle callbacks to the merchant.
- **Checkout app** (`src/checkout/CheckoutApp.tsx` or similar) - runs inside the iframe and handles the payment form and simulated payment flow.

### Communication

The communication between the merchant (Demo App) and the Checkout (Iframe) relies on `postMessage`.

```text
Merchant
   ↓
DodoCheckout.open()
   ↓
SDK creates an iframe covering the screen
   ↓
Checkout app renders inside the iframe
   ↓
(User interacts, submits payment)
   ↓
postMessage sends payment results
   ↓
SDK receives the message
   ↓
Merchant callbacks (onSuccess, onError, onClose) are triggered
```