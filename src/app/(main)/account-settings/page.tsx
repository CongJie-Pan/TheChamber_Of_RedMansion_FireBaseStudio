/**
 * @fileOverview Account Settings Page
 *
 * This page provides account management functionality for users,
 * including both guest and regular users.
 *
 * Key Features:
 * - Display user account information
 * - Account reset functionality with text confirmation dialog
 * - Supports both guest and regular users
 *
 * Security:
 * - All reset operations require text confirmation ("我確定要重設帳號")
 * - Users can only reset their own account
 * - Comprehensive confirmation dialog to prevent accidental data loss
 * - Loading states and error handling
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, RotateCcw, User, Mail } from "lucide-react";

/**
 * Account Settings Page Component
 *
 * Displays account settings and management options based on user type:
 * - Guest users: Option to reset all account data
 * - Regular users: Account information and preferences (coming soon)
 */
export default function AccountSettingsPage() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();

  const [isAccountResetting, setIsAccountResetting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Required confirmation text
  const requiredText = t('accountSettings.resetAccountRequiredText');

  /**
   * Handle account reset for all users
   *
   * This function:
   * 1. Validates the confirmation text
   * 2. Calls the reset API endpoint
   * 3. Shows success/error toast
   * 4. Redirects to dashboard on success
   */
  const handleResetAccount = async () => {
    if (!user) {
      toast({
        title: t('accountSettings.resetError'),
        description: 'User not found.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    // Verify confirmation text
    if (confirmationText !== requiredText) {
      toast({
        title: t('accountSettings.resetError'),
        description: 'Confirmation text does not match.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    setIsAccountResetting(true);

    try {
      const response = await fetch('/api/user/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          confirmationText: confirmationText,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: t('accountSettings.resetAccountSuccess'),
          description: result.message,
          duration: 5000,
        });

        // Close dialog and reset state
        setIsResetDialogOpen(false);
        setConfirmationText('');

        // Wait a moment for the toast to be visible, then redirect
        setTimeout(() => {
          router.refresh();
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        toast({
          title: t('accountSettings.resetError'),
          description: result.error || result.message,
          variant: 'destructive',
          duration: 5000,
        });
        setIsAccountResetting(false);
      }
    } catch (error) {
      console.error('Error resetting account:', error);
      toast({
        title: t('accountSettings.resetError'),
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
        duration: 5000,
      });
      setIsAccountResetting(false);
    }
  };

  // Loading state while user data is being fetched
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('accountSettings.pageTitle')}</h1>
        <p className="mt-2 text-muted-foreground">
          {userProfile?.isGuest
            ? t('accountSettings.guestUserDescription')
            : t('accountSettings.regularUserDescription')}
        </p>
      </div>

      <Separator />

      {/* Guest User Section */}
      {userProfile?.isGuest ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('accountSettings.guestUserSection')}
            </CardTitle>
            <CardDescription>{t('accountSettings.guestUserDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info Display */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user.name || t('community.anonymousUser')}</span>
              </div>
              {user.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{user.email}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Reset Account Section */}
            <div className="space-y-4">
              <div className="rounded-lg bg-destructive/10 p-4 text-sm">
                <p className="font-semibold text-destructive">{t('accountSettings.resetAccountWarning')}</p>
              </div>

              <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full"
                    disabled={isAccountResetting}
                  >
                    {isAccountResetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('accountSettings.resetting')}
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {t('accountSettings.resetAccountButton')}
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {t('accountSettings.resetAccountConfirmTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>{t('accountSettings.resetAccountConfirmDescription')}</p>
                        <p className="font-semibold text-destructive">
                          {t('accountSettings.resetAccountWarning')}
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="guestConfirmText">
                            {t('accountSettings.resetAccountInputLabel')} <span className="font-mono font-bold">{requiredText}</span>
                          </Label>
                          <Input
                            id="guestConfirmText"
                            type="text"
                            placeholder={t('accountSettings.resetAccountInputPlaceholder')}
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            disabled={isAccountResetting}
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      disabled={isAccountResetting}
                      onClick={() => setConfirmationText('')}
                    >
                      {t('buttons.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetAccount}
                      disabled={isAccountResetting || confirmationText !== requiredText}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isAccountResetting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('accountSettings.resetting')}
                        </>
                      ) : (
                        t('accountSettings.resetAccountButton')
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Regular User Section */
        <Card>
          <CardHeader>
            <CardTitle>{t('accountSettings.regularUserSection')}</CardTitle>
            <CardDescription>{t('accountSettings.regularUserDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Info Display */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">Display Name</p>
                </div>
              </div>
              {user.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground">{t('login.emailLabel')}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Reset Account Section */}
            <div className="space-y-4">
              <div className="rounded-lg bg-destructive/10 p-4 text-sm">
                <p className="font-semibold text-destructive">{t('accountSettings.resetAccountWarning')}</p>
              </div>

              <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full"
                    disabled={isAccountResetting}
                  >
                    {isAccountResetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('accountSettings.resetting')}
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {t('accountSettings.resetAccountButton')}
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {t('accountSettings.resetAccountConfirmTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>{t('accountSettings.resetAccountConfirmDescription')}</p>
                        <p className="font-semibold text-destructive">
                          {t('accountSettings.resetAccountWarning')}
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="confirmText">
                            {t('accountSettings.resetAccountInputLabel')} <span className="font-mono font-bold">{requiredText}</span>
                          </Label>
                          <Input
                            id="confirmText"
                            type="text"
                            placeholder={t('accountSettings.resetAccountInputPlaceholder')}
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            disabled={isAccountResetting}
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      disabled={isAccountResetting}
                      onClick={() => setConfirmationText('')}
                    >
                      {t('buttons.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetAccount}
                      disabled={isAccountResetting || confirmationText !== requiredText}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isAccountResetting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('accountSettings.resetting')}
                        </>
                      ) : (
                        t('accountSettings.resetAccountButton')
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
