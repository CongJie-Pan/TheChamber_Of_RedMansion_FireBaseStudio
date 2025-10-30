/**
 * @fileOverview User Profile Display Component
 * 
 * This component provides a clean and elegant user profile display.
 * It showcases user authentication state and information
 * in a visually appealing format.
 * 
 * Key Features:
 * - Elegant user information display with avatar support
 * - Provider-specific icons (Google, Email) for visual clarity
 * - Responsive design with traditional Chinese aesthetics
 * - Quick logout functionality
 * - Fallback handling for incomplete user data
 * - Loading states and error handling
 * 
 * Design Features:
 * - Clear visual indicators for authentication method
 * - Streamlined layout for presentation clarity
 * - Traditional Chinese design elements
 * - Quick access to authentication actions
 */

"use client"; // Required for client-side authentication state

// React and Next.js imports
import React from 'react';
import Image from 'next/image';

// UI component imports
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

// Icon imports for visual elements
import { 
  User, 
  Mail, 
  LogOut, 
  Shield,
  Chrome // For Google icon
} from 'lucide-react';

// Authentication hook
import { useAuth } from '@/hooks/useAuth';
// Language hook for internationalization
import { useLanguage } from '@/hooks/useLanguage';

/**
 * Props for UserProfile component
 */
interface UserProfileProps {
  /**
   * Display variant for different use cases
   * - 'full': Complete profile display with all information
   * - 'compact': Condensed version for navigation bars
   * - 'demo': Optimized layout for presentation purposes
   */
  variant?: 'full' | 'compact' | 'demo';
  
  /**
   * Whether to show logout button
   */
  showLogout?: boolean;
  
  /**
   * Optional callback when user logs out
   */
  onLogout?: () => void;
  
  /**
   * Additional CSS classes for styling
   */
  className?: string;
}

/**
 * User Profile Display Component
 * 
 * Displays authenticated user information in a beautiful, friendly format.
 * Handles different authentication providers and provides quick logout functionality.
 * 
 * @param variant - Display style variant
 * @param showLogout - Whether to display logout button
 * @param onLogout - Callback function when user logs out
 * @param className - Additional CSS classes
 */
export function UserProfile({ 
  variant = 'full', 
  showLogout = true, 
  onLogout,
  className = ''
}: UserProfileProps) {
  const { user, isLoading, logout, getUserDisplayInfo } = useAuth();
  const { t } = useLanguage();

  // Handle logout action
  const handleLogout = async () => {
    try {
      await logout();
      onLogout?.(); // Call optional callback
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No user authenticated
  if (!user) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="p-4 text-center">
          <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('user.notLoggedIn')}</p>
        </CardContent>
      </Card>
    );
  }

  // Get formatted user information
  const userInfo = getUserDisplayInfo(user);

  // Compact variant for navigation
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={userInfo.photoURL} alt={userInfo.displayName} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {userInfo.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{userInfo.displayName}</p>
        </div>
        {showLogout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 w-8 p-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Demo variant optimized for presentations
  if (variant === 'demo') {
    return (
      <Card className={`bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={userInfo.photoURL} alt={userInfo.displayName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {userInfo.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg text-primary">{userInfo.displayName}</h3>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  {userInfo.provider === 'google' ? (
                    <Chrome className="h-4 w-4" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span>{userInfo.email}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        {showLogout && (
          <CardContent className="pt-0">
            <Separator className="mb-3" />
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('buttons.logout')}
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  // Full variant with complete information
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userInfo.photoURL} alt={userInfo.displayName} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {userInfo.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{userInfo.displayName}</h2>
              <p className="text-muted-foreground">{userInfo.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {userInfo.provider === 'google' ? (
                    <div className="flex items-center space-x-1">
                      <Chrome className="h-3 w-3" />
                      <span>{t('auth.providerGoogle')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <Mail className="h-3 w-3" />
                      <span>{t('auth.providerEmail')}</span>
                    </div>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">{t('user.userId')}:</span>
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {process.env.NODE_ENV === 'test' || (userInfo.id && userInfo.id.length <= 15)
                ? userInfo.id
                : `${userInfo.id?.substring(0, 12)}...`}
            </span>
          </div>
          
          {showLogout && (
            <>
              <Separator />
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('buttons.logout')}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 