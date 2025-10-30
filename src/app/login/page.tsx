/**
 * @fileOverview Login Page Component for Red Mansion Learning Platform
 * 
 * This component provides a secure authentication interface for existing users to access
 * their accounts. It implements Firebase Authentication with email/password login,
 * comprehensive form validation, and multilingual support.
 * 
 * Key features:
 * - Firebase Authentication integration with email/password signin
 * - React Hook Form with Zod schema validation for robust input validation
 * - Internationalization support with dynamic error messages
 * - Elegant loading states and error handling with user-friendly feedback
 * - Responsive design with classical Chinese aesthetic
 * - Secure authentication flow with automatic redirect to dashboard
 * - Accessibility-compliant form structure and error announcements
 * 
 * Security considerations:
 * - Client-side validation with server-side Firebase validation
 * - Protected routing after successful authentication
 * - Clear error messages without revealing sensitive information
 * - Secure password handling with no client-side storage
 * 
 * The design maintains consistency with the overall platform aesthetic while
 * providing a professional and trustworthy login experience.
 */

"use client"; // Required for client-side authentication and form handling

// Next.js imports for navigation and routing
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Form handling and validation imports
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// UI component imports from the design system
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from '@/components/ui/checkbox';

// Icon imports for visual elements
import { ScrollText, AlertTriangle, PersonStanding } from 'lucide-react';

// NextAuth imports for authentication
import { signIn } from 'next-auth/react';

// React hooks for state management
import { useState } from 'react';

// Custom hooks for internationalization
import { useLanguage } from '@/hooks/useLanguage';

/**
 * Dynamic Login Form Validation Schema
 *
 * Creates a Zod validation schema with internationalized error messages.
 * This approach allows for dynamic error messages that change based on the
 * user's selected language, providing a localized experience.
 *
 * Phase 4 - SQLITE-021: Added rememberMe field for extended session support
 *
 * @param t - Translation function from useLanguage hook
 * @returns Zod schema object with validation rules and error messages
 */
const getLoginSchema = (t: (key: string) => string) => z.object({
  email: z.string().email({
    message: t('register.errors.emailInvalid') // Internationalized email validation error
  }),
  password: z.string().min(1, {
    message: t('register.errors.passwordMinLength') // Internationalized password validation error
  }),
  rememberMe: z.boolean().default(false), // Remember Me preference (Phase 4 - SQLITE-021)
});


export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  type LoginFormValues = z.infer<ReturnType<typeof getLoginSchema>>;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(getLoginSchema(t)),
    defaultValues: {
      rememberMe: false,
    },
  });

  /**
   * Handle email/password login with NextAuth
   * Phase 4 - SQLITE-021/022: NextAuth.js credentials provider with Remember Me support
   */
  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      console.log(`🔐 [Login Page] Attempting login for: ${data.email} (Remember Me: ${data.rememberMe})`);

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe.toString(), // Pass as string to credentials provider
        redirect: false, // Handle redirect manually
      });

      if (result?.error) {
        // Handle authentication errors
        console.error("❌ [Login Page] Login failed:", result.error);
        setAuthError(t('login.errorInvalidCredential'));
      } else if (result?.ok) {
        // Login successful
        console.log("✅ [Login Page] Login successful, redirecting to dashboard");
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error("❌ [Login Page] Unexpected login error:", error);
      setAuthError(t('login.errorDefault'));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle guest login with NextAuth
   * Phase 4 - SQLITE-021: Guest credentials provider for anonymous access
   */
  const handleGuestSignIn = async () => {
    setIsGuestLoading(true);
    setAuthError(null);
    try {
      console.log('👤 [Login Page] Attempting guest login...');

      const result = await signIn("guest-credentials", {
        redirect: false, // Handle redirect manually
      });

      if (result?.error) {
        console.error("❌ [Login Page] Guest login failed:", result.error);
        setAuthError(t('login.errorGuest'));
      } else if (result?.ok) {
        console.log("✅ [Login Page] Guest login successful, redirecting to dashboard");
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error("❌ [Login Page] Unexpected guest login error:", error);
      setAuthError(t('login.errorGuest'));
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/10 to-background p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/90 backdrop-blur-lg">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="inline-block mb-4">
             <ScrollText className="h-12 w-12 text-primary mx-auto" />
          </Link>
          <CardTitle className="text-3xl font-artistic text-primary">{t('login.welcomeBack')}</CardTitle>
          <CardDescription>{t('login.pageDescription')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {authError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t('login.errorTitle')}</AlertTitle>
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('placeholders.emailExample')}
                {...register("email")}
                className={`bg-background/70 ${errors.email ? 'border-destructive' : ''}`}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className={`bg-background/70 ${errors.password ? 'border-destructive' : ''}`}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {/* Remember Me Checkbox (Phase 4 - SQLITE-021) */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={false}
                onCheckedChange={(checked) => {
                  setValue('rememberMe', checked === true);
                }}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {t('login.rememberMe') || 'Remember me for 30 days'}
              </Label>
            </div>

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? t('login.loggingIn') : t('buttons.login')}
            </Button>

            {/* Guest Login Option (Phase 4 - SQLITE-021) */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('login.orContinueWith') || 'Or'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGuestSignIn}
              disabled={isGuestLoading || isLoading}
              className="w-full"
            >
              {isGuestLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <PersonStanding className="h-4 w-4" />
              )}
              <span className="ml-2">{t('login.guestLogin') || 'Continue as Guest'}</span>
            </Button>
          </CardContent>
        </form>
        <CardFooter className="text-center text-sm">
          {t('login.noAccount')}{' '}
          <Link href="/register" className="text-accent underline hover:text-accent/80">
            {t('login.registerNow')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
