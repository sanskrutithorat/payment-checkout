import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CheckoutMessage } from '../shared/messages';
import { simulatePayment } from './paymentSimulator';

interface FormData {
  email: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

interface FormErrors {
  email?: string;
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
}

export const CheckoutApp: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const emailInputRef = useRef<HTMLInputElement>(null);
  const [trustedParentOrigin, setTrustedParentOrigin] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;

      const data = event.data;
      if (data && data.source === 'dodo-sdk' && data.type === 'INIT') {
        setTrustedParentOrigin(event.origin);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendMessage = useCallback((msg: CheckoutMessage) => {
    if (trustedParentOrigin) {
      window.parent.postMessage(msg, trustedParentOrigin);
    }
  }, [trustedParentOrigin]);

  const handleClose = useCallback((reason: string = 'user') => {
    sendMessage({ source: 'dodo-checkout', type: 'CLOSE', payload: { reason } });
  }, [sendMessage]);

  useEffect(() => {
    if (trustedParentOrigin) {
      sendMessage({ source: 'dodo-checkout', type: 'READY' });
    }
  }, [trustedParentOrigin, sendMessage]);

  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing && !isSuccess) {
        handleClose('user');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, isSuccess, handleClose]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }

    const cleanCard = formData.cardNumber.replace(/\s+/g, '');
    if (cleanCard.length !== 16 || !/^\d+$/.test(cleanCard)) {
      newErrors.cardNumber = '16-digit card number required';
    }

    if (!/^\d{2}\/\d{2}$/.test(formData.expiry)) {
      newErrors.expiry = 'MM/YY required';
    } else {
      const [monthStr, yearStr] = formData.expiry.split('/');
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      const currentYear = parseInt(new Date().getFullYear().toString().slice(-2), 10);
      const currentMonth = new Date().getMonth() + 1;

      if (month < 1 || month > 12) {
        newErrors.expiry = 'Invalid month';
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        newErrors.expiry = 'Card expired';
      }
    }

    if (!/^\d{3,4}$/.test(formData.cvv)) {
      newErrors.cvv = 'Valid CVV required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;

    if (name === 'cardNumber') value = formatCardNumber(value);
    if (name === 'expiry') value = formatExpiry(value);
    if (name === 'cvv') value = value.replace(/[^0-9]/g, '').slice(0, 4);

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    setGlobalError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing || isSuccess) return;

    if (!validate()) return;

    setIsProcessing(true);
    setGlobalError('');

    try {
      const result = await simulatePayment(formData.cardNumber);

      if (result.success) {
        setIsProcessing(false);
        setIsSuccess(true);
        sendMessage({ source: 'dodo-checkout', type: 'PAYMENT_SUCCESS', payload: { sessionId: result.sessionId } });

        setTimeout(() => {
          sendMessage({ source: 'dodo-checkout', type: 'CLOSE', payload: { reason: 'success' } });
        }, 2000);
      } else {
        setIsProcessing(false);
        setGlobalError(result.message);
        sendMessage({ source: 'dodo-checkout', type: 'PAYMENT_ERROR', payload: { code: result.code, message: result.message } });
      }
    } catch {
      const message = 'An unexpected error occurred.';

      setIsProcessing(false);
      setGlobalError(message);

      sendMessage({
        source: 'dodo-checkout',
        type: 'PAYMENT_ERROR',
        payload: {
          code: 'unknown_error',
          message,
        },
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="checkout-container success-state">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 tabIndex={-1}>Payment successful</h2>
        <p>Thank you for your purchase.</p>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <header className="checkout-header">
        <div className="product-info">
          <h2 tabIndex={-1}>Premium Course Plan</h2>
          <div className="price">₹999</div>
        </div>
        <button
          type="button"
          className="close-button"
          onClick={() => handleClose('user')}
          aria-label="Close checkout"
          disabled={isProcessing}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>

      {globalError && (
        <div className="global-error" role="alert">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            ref={emailInputRef}
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="student@example.com"
            disabled={isProcessing}
            autoComplete="email"
            className={errors.email ? 'error' : ''}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && <span id="email-error" className="error-message" role="alert">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="cardNumber">Card information</label>
          <div className="card-input-wrapper">
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleChange}
              placeholder="0000 0000 0000 0000"
              disabled={isProcessing}
              maxLength={19}
              autoComplete="cc-number"
              className={errors.cardNumber ? 'error' : ''}
              aria-label="Card number"
              aria-invalid={!!errors.cardNumber}
            />
            <div className="card-row">
              <div className="input-half">
                <input
                  type="text"
                  name="expiry"
                  value={formData.expiry}
                  onChange={handleChange}
                  placeholder="MM/YY"
                  disabled={isProcessing}
                  maxLength={5}
                  autoComplete="cc-exp"
                  className={errors.expiry ? 'error' : ''}
                  aria-label="Expiry date"
                  aria-invalid={!!errors.expiry}
                />
              </div>
              <div className="input-half">
                <input
                  type="password"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleChange}
                  placeholder="CVV"
                  disabled={isProcessing}
                  maxLength={4}
                  autoComplete="cc-csc"
                  className={errors.cvv ? 'error' : ''}
                  aria-label="CVV"
                  aria-invalid={!!errors.cvv}
                />
              </div>
            </div>
          </div>
          {(errors.cardNumber || errors.expiry || errors.cvv) && (
            <span className="error-message" role="alert">
              {errors.cardNumber || errors.expiry || errors.cvv}
            </span>
          )}
        </div>

        <button type="submit" className="pay-button" disabled={isProcessing}>
          {isProcessing ? 'Processing payment...' : 'Pay ₹999'}
        </button>
      </form>
      <div className="secure-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        Payments are secure and encrypted
      </div>
    </div>
  );
};
