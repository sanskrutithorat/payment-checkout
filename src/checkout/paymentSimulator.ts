export type PaymentResult =
  | { success: true; sessionId: string }
  | { success: false; code: string; message: string };

const failedOnceCards = new Set<string>();

export async function simulatePayment(cardNumber: string): Promise<PaymentResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const cleanCard = cardNumber.replace(/\s+/g, '');

  if (cleanCard === '4242424242424242') {
    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 11);
    return { success: true, sessionId };
  }

  if (cleanCard === '4000000000000002') {
    return { success: false, code: 'card_declined', message: 'Your card was declined. Please check your details or try another card.' };
  }

  if (cleanCard === '4000000000000341') {
    if (!failedOnceCards.has(cleanCard)) {
      failedOnceCards.add(cleanCard);
      return { success: false, code: 'payment_failed', message: 'Something went wrong. Please try again.' };
    } else {
      const sessionId = 'sess_' + Math.random().toString(36).substring(2, 11);
      return { success: true, sessionId };
    }
  }

  return { success: false, code: 'invalid_card', message: 'Invalid test card. Try 4242 4242 4242 4242.' };
}
