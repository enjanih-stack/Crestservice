import React, {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister any active service workers to ensure users get the latest version
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => {
      for (const registration of registrations) {
        registration.unregister().catch(err => {
          console.log("[MAIN] Individual unregistration failed:", err);
        });
        console.log("[MAIN] Service Worker unregistered to ensure fresh content.");
      }
    })
    .catch(err => {
      console.log("[MAIN] Service worker unregistration skipped or unsupported in this sandbox environment:", err.message || err);
    });
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[ERROR BOUNDARY]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener('error', (event) => {
  console.error("[GLOBAL ERROR]", event.error);
  const root = document.getElementById('root');
  if (root && (root.innerHTML === '' || root.innerHTML.length < 100)) {
    root.innerHTML = `<div style="padding: 40px; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; font-family: sans-serif; max-width: 800px; margin: 40px auto; shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <h1 style="margin-top: 0;">Runtime Error Detected</h1>
      <p>The application failed to render or crashed during boot.</p>
      <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 4px; overflow: auto;">
        <strong>Error:</strong> ${event.error?.message || event.message}<br/>
        <details>
          <summary style="cursor: pointer; margin-top: 10px; font-weight: bold;">View Stack Trace</summary>
          <pre style="white-space: pre-wrap; font-size: 12px; margin-top: 10px;">${event.error?.stack || 'No stack trace available'}</pre>
        </details>
      </div>
      <p style="margin-top: 20px; font-size: 14px; opacity: 0.8;">Check the browser console for more details.</p>
    </div>`;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("[UNHANDLED REJECTION]", event.reason);
  const root = document.getElementById('root');
  if (root && (root.innerHTML === '' || root.innerHTML.length < 100)) {
     root.innerHTML += `<div style="padding: 20px; color: #856404; background: #fff3cd; border: 1px solid #ffeeba; margin-top: 10px; border-radius: 8px;">
       <strong>Unhandled Promise Rejection:</strong> ${event.reason?.message || event.reason}
     </div>`;
  }
});

console.log("[MAIN] Initializing React app...");
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
console.log("[MAIN] React app render triggered.");
