/**
 * @fileOverview Account Settings Page
 *
 * This page provides account management functionality for users,
 * with special features for guest/anonymous users.
 *
 * Key Features:
 * - Display user account information
 * - Guest user data reset functionality with confirmation dialog
 * - Regular user account settings (coming soon)
 *
 * Security:
 * - Guest user reset is only available for authenticated anonymous users
 * - Comprehensive confirmation dialog to prevent accidental data loss
 * - Loading states and error handling
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { userLevelService } from "@/lib/user-level-service";
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
import { Loader2, AlertTriangle, RotateCcw, User, Mail } from "lucide-react";

/**
 * Account Settings Page Component
 *
 * Displays account settings and management options based on user type:
 * - Guest users: Option to reset all account data
 * - Regular users: Account information and preferences (coming soon)
 */
export default function AccountSettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();

  const [isResetting, setIsResetting] = useState(false);

  /**
   * Handle guest user data reset
   *
   * This function:
   * 1. Validates the user is a guest
   * 2. Calls the reset service method
   * 3. Shows success/error toast
   * 4. Reloads the page on success
   */
  const handleResetGuestData = async () => {
    if (!user || !user.isAnonymous) {
      toast({
        title: t('accountSettings.resetError'),
        description: 'Only guest users can reset their data.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    setIsResetting(true);

    try {
      const result = await userLevelService.resetGuestUserData(
        user.uid,
        user.displayName || 'Guest User',
        user.email || 'guest@example.com'
      );

      if (result.success) {
        toast({
          title: t('accountSettings.resetSuccess'),
          description: result.message,
          duration: 5000,
        });

        // Wait a moment for the toast to be visible, then reload
        setTimeout(() => {
          router.refresh();
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        toast({
          title: t('accountSettings.resetError'),
          description: result.message,
          variant: 'destructive',
          duration: 5000,
        });
        setIsResetting(false);
      }
    } catch (error) {
      console.error('Error resetting guest data:', error);
      toast({
        title: t('accountSettings.resetError'),
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
        duration: 5000,
      });
      setIsResetting(false);
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
          {user.isAnonymous
            ? t('accountSettings.guestUserDescription')
            : t('accountSettings.regularUserDescription')}
        </p>
      </div>

      <Separator />

      {/* Guest User Section */}
      {user.isAnonymous ? (
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
                <span className="font-medium">{user.displayName || t('community.anonymousUser')}</span>
              </div>
              {user.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{user.email}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Warning Message */}
            <div className="rounded-lg bg-destructive/10 p-4 text-sm">
              <p className="font-semibold text-destructive">{t('accountSettings.resetWarning')}</p>
            </div>

            {/* Reset Button with Confirmation Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('accountSettings.resetting')}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {t('accountSettings.resetButton')}
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    {t('accountSettings.resetConfirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <div className="space-y-2">
                      <div>{t('accountSettings.resetConfirmDescription')}</div>
                      <div className="font-semibold text-destructive">
                        {t('accountSettings.resetWarning')}
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isResetting}>
                    {t('buttons.cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetGuestData}
                    disabled={isResetting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('accountSettings.resetting')}
                      </>
                    ) : (
                      t('buttons.confirm')
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                  <p className="text-sm font-medium">{user.displayName}</p>
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

            {/* Coming Soon Notice */}
            <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
              <p>{t('appShell.settings')} - More features coming soon!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
