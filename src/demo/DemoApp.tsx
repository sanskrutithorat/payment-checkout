import React, { useState, useCallback } from 'react';
import { DodoCheckout } from '../sdk/DodoCheckout';

interface EventLog {
  time: string;
  type: string;
  data?: Record<string, string>;
}

export const DemoApp: React.FC = () => {
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const addLog = useCallback((type: string, data?: Record<string, string>) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs((prev) => [...prev, { time, type, data }]);
  }, []);

  const handleBuyClick = () => {
    if (isCheckoutOpen) return;
    setIsCheckoutOpen(true);
    addLog('checkout.opened');
    DodoCheckout.open({
      productId: 'prod_123',
      onSuccess: ({ sessionId }) => {
        addLog('payment.success', { sessionId });
        setIsCheckoutOpen(false);
      },
      onClose: ({ reason }) => {
        addLog('checkout.closed', { reason });
        setIsCheckoutOpen(false);
      },
      onError: ({ code, message }) => {
        addLog('payment.error', { code, message });
      },
    });
  };

  return (
    <div className="demo-container">
      <header className="demo-header">
        <h1>Dodo Store</h1>
      </header>
      
      <main className="demo-main">
        <section className="demo-product">
          <div className="product-card">
            <h2>Premium Developer Plan</h2>
            <p className="price">₹999 <span>/ month</span></p>
            <ul className="features">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Unlimited API requests
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                24/7 Priority support
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Advanced analytics
              </li>
            </ul>
            <button 
              className="buy-button" 
              onClick={handleBuyClick}
              disabled={isCheckoutOpen}
            >
              {isCheckoutOpen ? 'Checkout open' : 'Buy now'}
            </button>
          </div>
        </section>

        <aside className="demo-logs">
          <h3>Callback Events</h3>
          <div className="log-window">
            {logs.length === 0 ? (
              <div className="log-empty">Waiting for events...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="log-entry">
                  <span className="log-time">{log.time}</span>
                  <span className="log-type">{log.type}</span>
                  {log.data && <span className="log-data">{JSON.stringify(log.data)}</span>}
                </div>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};
