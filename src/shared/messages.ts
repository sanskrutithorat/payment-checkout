export type CheckoutMessage =
  | {
      source: 'dodo-sdk';
      type: 'INIT';
    }
  | {
      source: 'dodo-checkout';
      type: 'READY';
    }
  | {
      source: 'dodo-checkout';
      type: 'PAYMENT_SUCCESS';
      payload: { sessionId: string };
    }
  | {
      source: 'dodo-checkout';
      type: 'PAYMENT_ERROR';
      payload: {
        code: string;
        message: string;
      };
    }
  | {
      source: 'dodo-checkout';
      type: 'CLOSE';
      payload: {
        reason: string;
      };
    };
