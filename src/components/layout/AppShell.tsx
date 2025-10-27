/**
 * @fileOverview Main Application Shell Component
 * 
 * This component serves as the primary layout wrapper for the authenticated areas of the 
 * Red Mansion Learning Platform. It provides consistent navigation, user management, and
 * layout structure across all protected pages.
 * 
 * Key Features:
 * - Responsive sidebar navigation with icons and labels
 * - User authentication state display and logout functionality
 * - Language switcher in the header
 * - Active page highlighting in navigation
 * - Mobile-responsive design with collapsible sidebar
 * 
 * Technical Architecture:
 * - Uses Shadcn/ui Sidebar components for consistent layout
 * - Integrates with Firebase Authentication for user management
 * - Supports internationalization through LanguageContext
 * - Implements Next.js Link components for client-side navigation
 */

"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Settings,
  ScrollText,
  LayoutDashboard,
  LogOut,
  Users,
  Trophy,
  ChevronDown,
  Target,
} from "lucide-react";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES } from "@/lib/translations";
import type { Language } from "@/lib/translations";
import { dailyTaskClientService } from "@/lib/daily-task-client-service";

/**
 * AppShell Component Props Interface
 * 
 * @interface AppShellProps
 * @property {ReactNode} children - The main content to be rendered within the shell layout
 */
export function AppShell({ children }: { children: ReactNode }) {
  // Next.js hooks for navigation and routing
  const pathname = usePathname(); // Get current page path for active navigation highlighting
  const router = useRouter(); // Router instance for programmatic navigation
  
  // Custom hooks for authentication and language management
  const { user } = useAuth(); // Current authenticated user state
  const { language, setLanguage, t } = useLanguage(); // Language state and translation function

  // State for tracking incomplete daily tasks (for red dot notification)
  const [hasIncompleteTasks, setHasIncompleteTasks] = useState(false);

  /**
   * Check for incomplete daily tasks
   * Used to show red dot notification badge on daily tasks nav item
   */
  useEffect(() => {
    const checkIncompleteTasks = async () => {
      if (!user) return;

      try {
        const progress = await dailyTaskClientService.getUserDailyProgress(user.uid);
        if (progress) {
          const totalTasks = progress.tasks.length;
          const completedTasks = progress.completedTaskIds.length;
          setHasIncompleteTasks(completedTasks < totalTasks && totalTasks > 0);
        }
      } catch (error) {
        console.error('Error checking incomplete tasks:', error);
      }
    };

    checkIncompleteTasks();
  }, [user, pathname]); // Re-check when path changes (user might complete tasks)

  /**
   * Navigation Items Configuration
   *
   * Defines the main navigation structure for the application.
   * Each item includes:
   * - href: Route path for navigation
   * - labelKey: Translation key for multilingual labels
   * - icon: Lucide React icon component
   * - badge: Optional badge count or boolean for notification dot
   */
  const navItems = [
    { href: "/dashboard", labelKey: "sidebar.home", icon: LayoutDashboard },
    { href: "/read", labelKey: "sidebar.read", icon: BookOpen },
    { href: "/daily-tasks", labelKey: "sidebar.dailyTasks", icon: Target, badge: hasIncompleteTasks },
    { href: "/achievements", labelKey: "sidebar.achievements", icon: Trophy },
    { href: "/community", labelKey: "sidebar.community", icon: Users },
  ];
  
  /**
   * User Logout Handler
   * 
   * Handles the user logout process by:
   * 1. Calling Firebase signOut function
   * 2. Redirecting to login page on success
   * 3. Logging errors for debugging
   */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login'); 
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    /**
     * Main Layout Structure
     * 
     * SidebarProvider: Manages sidebar open/closed state and responsive behavior
     * defaultOpen: Sets sidebar to be open by default on desktop
     */
    <SidebarProvider defaultOpen>
      {/* Left Sidebar Navigation */}
      <Sidebar className="border-r-sidebar-border">
        {/* Sidebar Header with App Logo and Title */}
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* App logo using ScrollText icon */}
            <ScrollText className="h-8 w-8 text-primary" />
            {/* App name with artistic font styling */}
            <h1 className="text-xl font-artistic text-white">{t('appName')}</h1>
          </Link>
        </SidebarHeader>
        
        {/* Main Navigation Menu */}
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.labelKey}>
                <SidebarMenuButton
                    asChild
                    className="w-full justify-start"
                    /**
                     * Active State Logic
                     *
                     * Determines if a navigation item should be highlighted as active:
                     * - Exact path match (pathname === item.href)
                     * - Path starts with item.href (for nested routes)
                     * - Special case: /read-book should highlight /read nav item
                     */
                    variant={pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/') || (pathname === '/read-book' && item.href === '/read') ? "default" : "outline"}
                    isActive={pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/') || (pathname === '/read-book' && item.href === '/read')}
                    tooltip={t(item.labelKey)}
                  >
                    <Link href={item.href}>
                      {/* Navigation icon */}
                      <item.icon />
                      {/* Navigation label with text truncation for responsive design */}
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                  {/* Red dot notification badge for incomplete tasks */}
                  {item.badge && (
                    <SidebarMenuBadge className="bg-red-500 text-white">
                      <span className="sr-only">Incomplete tasks</span>
                      •
                    </SidebarMenuBadge>
                  )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        
        {/* Sidebar Footer with User Information */}
        <SidebarFooter className="p-4">
          <Separator className="my-2 bg-sidebar-border" />
          
          {/* User Account Section - Conditional rendering based on authentication state */}
           {user ? (
             /**
              * Authenticated User Dropdown Menu
              * 
              * Displays user information and provides access to:
              * - Account settings (currently disabled)
              * - Logout functionality
              */
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex h-auto w-full items-center justify-start gap-2 p-2">
                  {/* User avatar using Font Awesome icon */}
                  <i 
                    className="fa fa-user-circle text-sidebar-foreground" 
                    aria-hidden="true"
                    style={{ fontSize: '32px', width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  ></i>
                  {/* User information display */}
                  <div className="text-left">
                    {/* Display name with fallback to anonymous user label */}
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{user.displayName || t('community.anonymousUser')}</p>
                    {/* User email address */}
                    <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              
              {/* Dropdown menu content */}
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel>{t('appShell.userAccount')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Settings option */}
                <DropdownMenuItem asChild>
                  <Link href="/account-settings" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('appShell.settings')}</span>
                  </Link>
                </DropdownMenuItem>
                
                {/* Logout option */}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('buttons.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
           ) : (
            /**
             * Unauthenticated State
             * 
             * Shows login button when user is not authenticated
             * This should rarely be visible in protected routes due to auth guards
             */
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/login">{t('buttons.login')}</Link>
            </Button>
           )}
        </SidebarFooter>
      </Sidebar>
      
      {/* Main Content Area */}
      <SidebarInset>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-md">
          {/* Mobile sidebar trigger - only visible on small screens */}
          <SidebarTrigger className="md:hidden" /> 
          
          {/* Spacer element for header layout balance */}
          <div></div> {/* Placeholder for potential header content on the right */}
          
          {/* Language Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-xs sm:text-sm font-medium text-foreground/70 hover:text-foreground px-2 sm:px-3">
                {/* Display current language name with fallback to language code */}
                {LANGUAGES.find(lang => lang.code === language)?.name || language}
                <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            
            {/* Language options menu */}
            <DropdownMenuContent align="end">
              {LANGUAGES.map((langOption) => (
                <DropdownMenuItem
                  key={langOption.code}
                  onSelect={() => setLanguage(langOption.code as Language)}
                  disabled={language === langOption.code} // Disable current language option
                >
                  {langOption.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        
        {/* Main Content Container */}
        <main className="flex-1 overflow-y-auto p-6"> 
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
