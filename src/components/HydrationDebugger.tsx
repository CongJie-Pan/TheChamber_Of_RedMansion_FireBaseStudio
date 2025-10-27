/**
 * @fileOverview Hydration Debugger Component
 *
 * This development-only component helps diagnose hydration issues by monitoring
 * DOM changes and providing detailed information about what's causing mismatches
 * between server and client rendering.
 *
 * Features:
 * - Monitors HTML element className changes
 * - Detects when external scripts modify the DOM
 * - Provides debugging information in development mode
 * - Can be safely included in production (it won't render)
 *
 * Use this component to understand why hydration errors occur and identify
 * the source of DOM modifications that cause server/client mismatches.
 */

"use client";

import { useEffect } from 'react';

// Extend Window interface to include Material Design Lite properties
declare global {
  interface Window {
    componentHandler?: any;
    mdl?: any;
  }
}

/**
 * Hydration Debugger Component
 * 
 * Monitors DOM changes and logs information about potential hydration issues.
 * Only active in development mode for debugging purposes.
 * 
 * @returns null - This component doesn't render anything
 */
export default function HydrationDebugger() {
  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    console.log('🔍 Hydration Debugger: Starting DOM monitoring...');

    // Monitor initial HTML element state
    const htmlElement = document.documentElement;
    const initialClassName = htmlElement.className;
    
    console.log('📋 Initial HTML className:', initialClassName || '(empty)');

    // Function to check for className changes
    const checkClassNameChanges = () => {
      const currentClassName = htmlElement.className;
      if (currentClassName !== initialClassName) {
        console.log('⚠️ HTML className changed!');
        console.log('   Initial:', initialClassName || '(empty)');
        console.log('   Current:', currentClassName || '(empty)');
        
        // Check specifically for mdl-js
        if (currentClassName.includes('mdl-js')) {
          console.log('🎯 Found mdl-js class! This is likely causing the hydration error.');
          console.log('💡 Suggestion: Add suppressHydrationWarning={true} to <html> element');
        }
      }
    };

    // Monitor for DOM changes using MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target as HTMLElement;
          if (target.tagName === 'HTML') {
            console.log('🔄 HTML class attribute changed by:', {
              target: target.tagName,
              oldValue: mutation.oldValue,
              newValue: target.className,
              timestamp: new Date().toISOString()
            });
            
            // Try to identify the source
            console.trace('📍 Stack trace for className change:');
          }
        }
      });
    });

    // Start observing
    observer.observe(htmlElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['class']
    });

    // Check for common third-party scripts
    const checkThirdPartyScripts = () => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const externalScripts = scripts
        .map(script => script.src)
        .filter(src => src && !src.includes(window.location.origin))
        .filter(src => src.includes('material') || src.includes('mdl'));
      
      if (externalScripts.length > 0) {
        console.log('🌐 Found external scripts that might affect HTML:', externalScripts);
      }

      // Check for Material Design Lite
      if (window.componentHandler || (window as any).mdl) {
        console.log('🎨 Material Design Lite detected - this might be adding mdl-js class');
      }

      // Check for browser extensions
      const hasExtensionElements = document.querySelector('[data-extension]') || 
                                   document.querySelector('[id*="extension"]') ||
                                   document.querySelector('[class*="extension"]');
      
      if (hasExtensionElements) {
        console.log('🧩 Browser extension elements detected - these might modify HTML');
      }
    };

    // Run checks periodically
    const checkInterval = setInterval(checkClassNameChanges, 1000);
    
    // Initial check for third-party scripts
    setTimeout(checkThirdPartyScripts, 100);

    // Cleanup function
    return () => {
      observer.disconnect();
      clearInterval(checkInterval);
      console.log('🔍 Hydration Debugger: Stopped monitoring');
    };
  }, []);

  // This component doesn't render anything
  return null;
} 