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
import { Loader2, AlertTriangle, RotateCcw, User, Mail, Edit2, X, Check } from "lucide-react";

/**
 * Account Settings Page Component
 *
 * Displays account settings and management options based on user type:
 * - Guest users: Option to reset all account data
 * - Regular users: Account information and preferences (coming soon)
 */
export default function AccountSettingsPage() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();

  const [isAccountResetting, setIsAccountResetting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // TASK-001: Display name editing state
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);

  // Required confirmation text
  const requiredText = t('accountSettings.resetAccountRequiredText');

  /**
   * TASK-001: Handle display name update
   *
   * This function:
   * 1. Validates the display name input
   * 2. Calls the update API endpoint
   * 3. Shows success/error toast
   * 4. Refreshes the page to show updated data
   */
  const handleUpdateDisplayName = async () => {
    if (!user) return;

    setIsUpdatingDisplayName(true);

    try {
      const response = await fetch('/api/user/update-display-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: displayNameInput.trim() || null,
        }),
      });

      const result = await response.json();

      console.log('✅ [account-settings] API Response:', result);

      if (response.ok && result.success) {
        console.log('✅ [account-settings] DisplayName updated to:', result.displayName);

        toast({
          title: '顯示名稱已更新',
          description: result.displayName ? `已設定為: ${result.displayName}` : '已清除顯示名稱',
          duration: 3000,
        });

        // Exit edit mode
        setIsEditingDisplayName(false);

        // Refresh user profile to get updated data
        console.log('🔄 [account-settings] Refreshing user profile...');
        await refreshUserProfile();
        console.log('✅ [account-settings] User profile refreshed');

        // Also refresh the page router
        router.refresh();
      } else {
        toast({
          title: t('accountSettings.updateError') || 'Update Failed',
          description: result.error || 'Failed to update display name',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      toast({
        title: t('accountSettings.updateError') || 'Update Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsUpdatingDisplayName(false);
    }
  };

  /**
   * TASK-001: Start editing display name
   */
  const startEditingDisplayName = () => {
    setDisplayNameInput(userProfile?.displayName || '');
    setIsEditingDisplayName(true);
  };

  /**
   * TASK-001: Cancel editing display name
   */
  const cancelEditingDisplayName = () => {
    setDisplayNameInput('');
    setIsEditingDisplayName(false);
  };

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
            <div className="space-y-4">
              {/* TASK-001: Display Name with Edit Functionality */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">顯示名稱 (可更改)</Label>
                {isEditingDisplayName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      placeholder="輸入顯示名稱 (1-30 字元)"
                      maxLength={30}
                      disabled={isUpdatingDisplayName}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleUpdateDisplayName}
                      disabled={isUpdatingDisplayName}
                      className="px-3"
                    >
                      {isUpdatingDisplayName ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditingDisplayName}
                      disabled={isUpdatingDisplayName}
                      className="px-3"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium flex-1">
                      {userProfile?.displayName || '(未設定)'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={startEditingDisplayName}
                      className="h-8 px-2"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  用於在社群中顯示的公開名稱
                </p>
              </div>

              {/* Username Display (Read-only) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">使用者名稱 (不可更改)</Label>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">
                    {user.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  用於登入的帳號名稱
                </p>
              </div>

              {/* Email Display */}
              {user.email && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">電子郵件</Label>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{user.email}</span>
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
            <div className="space-y-4">
              {/* TASK-001: Display Name with Edit Functionality */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">顯示名稱 (可更改)</Label>
                {isEditingDisplayName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      placeholder="輸入顯示名稱 (1-30 字元)"
                      maxLength={30}
                      disabled={isUpdatingDisplayName}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleUpdateDisplayName}
                      disabled={isUpdatingDisplayName}
                      className="px-3"
                    >
                      {isUpdatingDisplayName ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditingDisplayName}
                      disabled={isUpdatingDisplayName}
                      className="px-3"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium flex-1">
                      {userProfile?.displayName || '(未設定)'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={startEditingDisplayName}
                      className="h-8 px-2"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  用於在社群中顯示的公開名稱
                </p>
              </div>

              {/* Username Display (Read-only) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">使用者名稱 (不可更改)</Label>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">
                    {user.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  用於登入的帳號名稱
                </p>
              </div>

              {/* Email Display */}
              {user.email && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">電子郵件</Label>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{user.email}</span>
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
