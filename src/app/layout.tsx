/**
 * @fileOverview Root layout component for the Red Mansion learning platform.
 * 
 * This is the top-level layout component that wraps the entire Next.js application.
 * It sets up essential providers, global styles, and HTML structure that applies
 * to all pages in the application.
 * 
 * Key responsibilities:
 * - Define application metadata (title, description) for SEO and social sharing
 * - Import global CSS styles including Tailwind CSS and custom fonts
 * - Set up authentication context for user login/logout state management
 * - Configure language/internationalization context for multilingual support
 * - Include external font resources (Font Awesome for icons)
 * - Provide toast notification system for user feedback
 * - Set initial HTML language attribute for accessibility
 * 
 * Provider hierarchy (from outer to inner):
 * 1. SessionProvider - NextAuth.js session management (Phase 4 - SQLITE-022)
 * 2. AuthProvider - Enhanced auth state with user profile from SQLite
 * 3. LanguageProvider - Manages language selection and translations
 * 4. Page content + Toaster notifications
 */

// Import Next.js metadata type for SEO configuration
import type { Metadata } from 'next';
// Import Next.js font optimization for Google Fonts
import { Noto_Serif_SC } from 'next/font/google';
// Import global CSS styles (Tailwind, fonts, custom styles)
import './globals.css';
// Import toast notification component for user feedback
import { Toaster } from "@/components/ui/toaster";
// Import NextAuth session provider (Phase 4 - SQLITE-022)
import { SessionProvider } from '@/components/providers/SessionProvider';
// Import authentication context provider
import { AuthProvider } from '@/context/AuthContext';
// Import language/internationalization context provider
import { LanguageProvider } from '@/context/LanguageContext';
// Import hydration debugger for development (only active in dev mode)
import HydrationDebugger from '@/components/HydrationDebugger';
// Import chunk error boundary for handling dynamic import failures
import ChunkErrorBoundary from '@/components/ChunkErrorBoundary';

// Configure Noto Serif SC (思源宋體) for classical Chinese typography
// Using Next.js font optimization for better performance and reliability
const notoSerifSC = Noto_Serif_SC({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-serif-sc',
});

/**
 * Application metadata configuration
 * 
 * Defines the default title and description for the application.
 * These values are used for:
 * - Browser tab titles
 * - Search engine optimization (SEO)
 * - Social media sharing previews
 * - Accessibility screen readers
 */

export const metadata: Metadata = {
  title: '紅樓慧讀', // "Red Mansion Intelligent Reading" - May become dynamic for specific pages
  description: '探索《紅樓夢》的智能閱讀夥伴 (An intelligent reading companion for exploring "Dream of the Red Chamber")',
};

/**
 * Root Layout Component
 * 
 * The main layout component that wraps all pages in the application.
 * Sets up the HTML document structure and provider hierarchy.
 * 
 * @param children - All page content that will be rendered inside this layout
 * @returns JSX.Element - Complete HTML document with providers and global elements
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // HTML document with initial language setting (will be updated by LanguageProvider)
    // suppressHydrationWarning prevents hydration errors caused by browser extensions
    // or third-party scripts that modify the HTML after server-side rendering
    <html lang="zh-TW" suppressHydrationWarning={true}> 
      <head>
        {/* External Font Awesome CSS for icon display throughout the application */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" 
          integrity="sha512-SfTiTlX6kk+qitfevl/7LibUOeJWlt9rbyDn92a1DqWOw9vWG2MFoays0sgObmWazO5BQPiFucnnEAjpAB+/Sw==" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer" 
        />
      </head>
      
      {/* Body with Noto Serif SC (思源宋體) for classical Chinese typography */}
      <body className={`${notoSerifSC.variable} font-sans`}>
        {/* Top-level chunk boundary to handle layout chunk failures */}
        <ChunkErrorBoundary enableAutoRetry={true} maxRetries={3}>
          {/* NextAuth Session Provider - Phase 4 - SQLITE-022 */}
          <SessionProvider>
            {/* Authentication Provider - Manages user login/logout state for entire app */}
            <ChunkErrorBoundary enableAutoRetry={true} maxRetries={2}>
              <AuthProvider>
                {/* Language Provider - Manages multilingual support and translations */}
                <ChunkErrorBoundary enableAutoRetry={true} maxRetries={2}>
                  <LanguageProvider>
                    {/* All page content is rendered here */}
                    {children}

                    {/* Toast notification system for user feedback messages */}
                    <ChunkErrorBoundary enableAutoRetry={true} maxRetries={3}>
                      <Toaster />
                    </ChunkErrorBoundary>

                    {/* Development-only hydration debugger */}
                    <ChunkErrorBoundary>
                      <HydrationDebugger />
                    </ChunkErrorBoundary>
                  </LanguageProvider>
                </ChunkErrorBoundary>
              </AuthProvider>
            </ChunkErrorBoundary>
          </SessionProvider>
        </ChunkErrorBoundary>
      </body>
    </html>
  );
}
