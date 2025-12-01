import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentKit demo",
  description: "Demo of ChatKit with hosted workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="beforeInteractive"
        />
        <Script
          id="fix-dictation-input"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Fix for macOS dictation duplicate input in production
                let lastInputValue = '';
                let debounceTimer = null;
                
                function handleInput(e) {
                  const target = e.target;
                  if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.contentEditable !== 'true')) {
                    return;
                  }
                  
                  const currentValue = target.value || target.textContent || target.innerText || '';
                  
                  // Clear any pending debounce
                  if (debounceTimer) {
                    clearTimeout(debounceTimer);
                  }
                  
                  // Debounce rapid input changes (dictation sends many rapid events)
                  debounceTimer = setTimeout(() => {
                    const finalValue = target.value || target.textContent || target.innerText || '';
                    
                    // If the value is shorter than last known value, it might be a reset
                    // If it contains the last value as a substring multiple times, it's likely a duplicate
                    if (lastInputValue && finalValue.length > lastInputValue.length) {
                      // Check for duplicate patterns (e.g., "BonjourBonjourBonjour")
                      const newPart = finalValue.slice(lastInputValue.length);
                      const duplicatePattern = newPart + newPart;
                      
                      if (finalValue.includes(duplicatePattern) || 
                          (newPart.length > 0 && finalValue.split(newPart).length > 2)) {
                        // Remove duplicates - keep only the last occurrence
                        const cleanValue = lastInputValue + newPart;
                        
                        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                          target.value = cleanValue;
                        } else {
                          target.textContent = cleanValue;
                          target.innerText = cleanValue;
                        }
                        
                        // Trigger input event with cleaned value
                        const inputEvent = new Event('input', { bubbles: true });
                        target.dispatchEvent(inputEvent);
                        
                        lastInputValue = cleanValue;
                        return;
                      }
                    }
                    
                    lastInputValue = finalValue;
                  }, 50);
                }
                
                // Wait for ChatKit to load, then attach listeners
                function attachListeners() {
                  const chatKitElement = document.querySelector('openai-chatkit');
                  if (!chatKitElement) {
                    setTimeout(attachListeners, 100);
                    return;
                  }
                  
                  // Listen for input events in shadow DOM and regular DOM
                  function setupListener(root) {
                    root.addEventListener('input', handleInput, true);
                    root.addEventListener('beforeinput', handleInput, true);
                  }
                  
                  // Try shadow DOM first
                  if (chatKitElement.shadowRoot) {
                    setupListener(chatKitElement.shadowRoot);
                  }
                  
                  // Also listen on document for any input
                  setupListener(document);
                  
                  // Use MutationObserver to catch dynamically added inputs
                  const observer = new MutationObserver(() => {
                    if (chatKitElement.shadowRoot) {
                      setupListener(chatKitElement.shadowRoot);
                    }
                  });
                  
                  observer.observe(chatKitElement, {
                    childList: true,
                    subtree: true
                  });
                }
                
                // Start when DOM is ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', attachListeners);
                } else {
                  // If ChatKit script loads after DOM, wait for it
                  window.addEventListener('chatkit-script-loaded', attachListeners);
                  attachListeners();
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
