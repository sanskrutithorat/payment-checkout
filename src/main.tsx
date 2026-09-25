import React from 'react'
import ReactDOM from 'react-dom/client'
import { DemoApp } from './demo/DemoApp'
import { CheckoutApp } from './checkout/CheckoutApp'
import './index.css'

const path = window.location.pathname;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {path === '/checkout' ? <CheckoutApp /> : <DemoApp />}
  </React.StrictMode>,
)
