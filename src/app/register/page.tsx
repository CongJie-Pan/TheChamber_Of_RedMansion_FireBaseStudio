
/**
 * @fileOverview User Registration Page Component for Red Mansion Learning Platform
 * 
 * This component provides a comprehensive multi-step registration process for new users
 * to create accounts and set up their learning profiles. It combines secure authentication
 * with personalized onboarding to tailor the learning experience from the start.
 * 
 * Key features:
 * - Multi-step registration wizard with progressive disclosure
 * - Firebase Authentication with email/password account creation
 * - User profile setup with learning preferences and goals
 * - React Hook Form with step-by-step validation
 * - Internationalization support throughout the process
 * - Elegant error handling and loading states
 * - Responsive design maintaining classical Chinese aesthetic
 * - Accessibility-compliant form navigation and feedback
 * 
 * Registration steps:
 * 1. Basic Information (name, email, password) - Required for account creation
 * 2. Learning Background - Skill level assessment for content personalization
 * 3. Reading Interests - Preference gathering for recommendation system
 * 4. Learning Goals - Goal setting for progress tracking and motivation
 * 
 * The multi-step approach reduces cognitive load while gathering necessary information
 * to provide a personalized learning experience from day one.
 */

"use client"; // Required for client-side form handling and authentication

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

// Icon imports for visual elements
import { ScrollText, AlertTriangle } from 'lucide-react';

// NextAuth import for auto-login after registration
import { signIn } from 'next-auth/react';

// React hooks for state management
import { useState } from 'react';

// Custom hooks for internationalization
import { useLanguage } from '@/hooks/useLanguage';

/**
 * Dynamic Registration Form Validation Schema
 *
 * Creates a simple Zod validation schema with internationalized error messages
 * for basic user registration with NextAuth.js authentication.
 *
 * Phase 4 - SQLITE-022: Simplified single-step registration
 *
 * @param t - Translation function from useLanguage hook
 * @returns Zod schema object with validation rules for registration
 */
const getRegisterSchema = (t: (key: string) => string) => z.object({
  firstName: z.string().min(1, {
    message: t('register.errors.firstNameRequired')
  }),
  lastName: z.string().min(1, {
    message: t('register.errors.lastNameRequired')
  }),
  email: z.string().email({
    message: t('register.errors.emailInvalid')
  }),
  password: z.string().min(8, {
    message: t('register.errors.passwordMinLength')
  }),
});


export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  type RegisterFormValues = z.infer<ReturnType<typeof getRegisterSchema>>;

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(getRegisterSchema(t)),
  });

  /**
   * Handle user registration with NextAuth
   * Phase 4 - SQLITE-022: Calls /api/auth/register endpoint and auto-logs in
   */
  const onSubmit: SubmitHandler<RegisterFormValues> = async (data) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      console.log(`📝 [Register Page] Attempting registration for: ${data.email}`);

      // Call our registration API endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle registration errors
        console.error("❌ [Register Page] Registration failed:", result);

        if (result.code === 'EMAIL_EXISTS') {
          setAuthError(t('register.errorEmailInUse') || 'Email already exists');
        } else if (result.code === 'WEAK_PASSWORD') {
          setAuthError(t('register.errorWeakPassword') || 'Password is too weak');
        } else {
          setAuthError(result.error || t('register.errorDefault') || 'Registration failed');
        }
        return;
      }

      // Registration successful - auto-login with NextAuth
      console.log("✅ [Register Page] Registration successful, auto-logging in...");

      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        console.error("❌ [Register Page] Auto-login failed:", signInResult.error);
        // Registration succeeded but login failed - redirect to login page
        router.push('/login');
      } else if (signInResult?.ok) {
        console.log("✅ [Register Page] Auto-login successful, redirecting to dashboard");
        router.push('/dashboard');
      }

    } catch (error: any) {
      console.error("❌ [Register Page] Unexpected registration error:", error);
      setAuthError(t('register.errorDefault') || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/10 to-background p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/90 backdrop-blur-lg">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="inline-block mb-4">
            <ScrollText className="h-12 w-12 text-primary mx-auto" />
          </Link>
          <CardTitle className="text-3xl font-artistic text-primary">{t('register.joinApp')}</CardTitle>
          <CardDescription>
            {t('register.step1Description') || 'Create your account to start your learning journey'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {authError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('register.errorTitle')}</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('register.firstNameLabel')}</Label>
                <Input
                  id="firstName"
                  placeholder={t('register.firstNamePlaceholder')}
                  {...register("firstName")}
                  className={`bg-background/70 ${errors.firstName ? 'border-destructive' : ''}`}
                />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('register.lastNameLabel')}</Label>
                <Input
                  id="lastName"
                  placeholder={t('register.lastNamePlaceholder')}
                  {...register("lastName")}
                  className={`bg-background/70 ${errors.lastName ? 'border-destructive' : ''}`}
                />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('register.emailLabel')}</Label>
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
              <Label htmlFor="password">{t('register.passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className={`bg-background/70 ${errors.password ? 'border-destructive' : ''}`}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (t('register.creatingAccount') || 'Creating Account...') : (t('register.createAndStart') || 'Create Account')}
            </Button>
          </CardContent>
        </form>
        <CardFooter className="text-center text-sm">
          {t('register.alreadyHaveAccount')}{' '}
          <Link href="/login" className="text-accent underline hover:text-accent/80">
            {t('buttons.login')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
