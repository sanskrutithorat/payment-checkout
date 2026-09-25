import type { CheckoutMessage } from '../shared/messages';

export interface DodoCheckoutOptions {
  productId: string;
  onSuccess: (data: { sessionId: string }) => void;
  onClose: (data: { reason: string }) => void;
  onError: (data: { code: string; message: string }) => void;
}

const ENV_ORIGIN = import.meta.env.VITE_CHECKOUT_ORIGIN;
const isLocalhostEnv = ENV_ORIGIN?.includes('localhost');
const isDeployed = !window.location.origin.includes('localhost');

// If deployed but env is still localhost (e.g. from committed .env file), fallback to the deployed origin
const CHECKOUT_ORIGIN = (isLocalhostEnv && isDeployed) 
  ? window.location.origin 
  : (ENV_ORIGIN || window.location.origin);

class DodoCheckoutSDK {
  private iframe: HTMLIFrameElement | null = null;
  private container: HTMLDivElement | null = null;
  private options: DodoCheckoutOptions | null = null;
  private isOpen: boolean = false;
  private loadTimeout: number | null = null;
  private pendingOptions: DodoCheckoutOptions | null = null;
  private initInterval: number | null = null;

  public open(options: DodoCheckoutOptions) {
    if (this.isOpen) {
      this.pendingOptions = options;
      return;
    }
    this.isOpen = true;
    this.options = options;

    this.container = document.createElement('div');
    this.container.id = 'dodo-checkout-container';
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '999999',
      opacity: '0',
      transition: 'opacity 0.3s ease',
    });

    this.iframe = document.createElement('iframe');
    const checkoutUrl = new URL('/checkout', CHECKOUT_ORIGIN);
    checkoutUrl.searchParams.set('productId', options.productId);

    this.iframe.src = checkoutUrl.toString();
    this.iframe.allow = 'payment';
    this.iframe.title = 'Dodo Checkout';
    Object.assign(this.iframe.style, {
      width: '400px',
      height: '620px',
      border: 'none',
      borderRadius: '24px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      transform: 'translateY(20px) scale(0.95)',
      transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      backgroundColor: 'transparent',
    });

    this.container.appendChild(this.iframe);
    document.body.appendChild(this.container);

    this.iframe.onload = () => {
      const initMessage: CheckoutMessage = { source: 'dodo-sdk', type: 'INIT' };
      const sendInit = () => {
        this.iframe?.contentWindow?.postMessage(initMessage, CHECKOUT_ORIGIN);
      };
      sendInit();
      this.initInterval = window.setInterval(sendInit, 500);
    };

    requestAnimationFrame(() => {
      if (this.container && this.iframe) {
        this.container.style.opacity = '1';
        this.iframe.style.transform = 'translateY(0) scale(1)';
      }
    });

    window.addEventListener('message', this.handleMessage);

    this.loadTimeout = window.setTimeout(() => {
      if (this.isOpen && this.options) {
        this.options.onError({ code: 'timeout', message: 'Checkout failed to load.' });
        this.close('error');
      }
    }, 10000);
  }

  private close(reason?: string) {
    if (!this.isOpen) return;

    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
    if (this.initInterval) {
      clearInterval(this.initInterval);
      this.initInterval = null;
    }

    if (this.container && this.iframe) {
      this.container.style.opacity = '0';
      this.iframe.style.transform = 'translateY(20px) scale(0.95)';

      setTimeout(() => {
        if (this.container && document.body.contains(this.container)) {
          document.body.removeChild(this.container);
        }
        this.container = null;
        this.iframe = null;
        this.isOpen = false;

        window.removeEventListener('message', this.handleMessage);

        if (this.options?.onClose && reason) {
          this.options.onClose({ reason });
        }
        this.options = null;

        if (this.pendingOptions) {
          const nextOptions = this.pendingOptions;
          this.pendingOptions = null;
          this.open(nextOptions);
        }
      }, 300);
    } else {
      this.isOpen = false;
      window.removeEventListener('message', this.handleMessage);
      this.options = null;

      if (this.pendingOptions) {
        const nextOptions = this.pendingOptions;
        this.pendingOptions = null;
        this.open(nextOptions);
      }
    }
  }

  private handleMessage = (event: MessageEvent) => {
    if (event.origin !== CHECKOUT_ORIGIN) return;

    if (event.source !== this.iframe?.contentWindow) return;

    const data = event.data;
    if (!data || data.source !== 'dodo-checkout') return;

    switch (data.type) {
      case 'READY':
        if (this.loadTimeout) {
          clearTimeout(this.loadTimeout);
          this.loadTimeout = null;
        }
        if (this.initInterval) {
          clearInterval(this.initInterval);
          this.initInterval = null;
        }
        break;

      case 'PAYMENT_SUCCESS':
        if (
          typeof data.payload?.sessionId !== 'string' ||
          !data.payload.sessionId
        ) {
          return;
        }
        if (this.options?.onSuccess) {
          this.options.onSuccess({ sessionId: data.payload.sessionId });
        }
        break;

      case 'PAYMENT_ERROR':
        if (
          typeof data.payload?.code !== 'string' ||
          typeof data.payload?.message !== 'string'
        ) {
          return;
        }
        if (this.options?.onError) {
          this.options.onError(data.payload);
        }
        break;

      case 'CLOSE':
        if (
          data.payload?.reason !== undefined &&
          typeof data.payload.reason !== 'string'
        ) {
          return;
        }
        const reason = data.payload?.reason || 'user';
        this.close(reason === 'success' ? undefined : reason);
        break;
    }
  };
}

export const DodoCheckout = new DodoCheckoutSDK();
