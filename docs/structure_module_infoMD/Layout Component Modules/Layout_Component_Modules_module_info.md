# Module: `Layout Component Modules`

## 1. Module Summary

This module provides the primary layout structure for the authenticated sections of the application. It establishes a consistent user interface shell, including navigation, header, and content areas, ensuring a unified user experience across all protected pages.

## 2. Module Dependencies

* **Internal Dependencies:**
    * `@/components/ui/sidebar`: For the main sidebar structure.
    * `@/components/ui/button`: For interactive button elements.
    * `@/components/ui/separator`: For visual dividers.
    * `@/components/ui/dropdown-menu`: For user and language selection menus.
    * `@/components/ui/chinese-window-nav-button`: For traditional Chinese window-styled navigation buttons.
    * `@/types/chinese-window`: For `WindowShape` type definitions.
    * `@/hooks/useAuth`: To access user authentication state.
    * `@/hooks/useLanguage`: To manage internationalization.
    * `@/lib/daily-task-client-service`: To check for incomplete daily tasks (uses API routes, not direct SQLite).
    * `@/lib/translations`: For language definitions.
    * `@/lib/utils`: For utility functions like `cn`.
* **External Dependencies:**
    * `react`: For component creation and state management.
    * `next/link`: For client-side navigation.
    * `next/navigation`: To access routing information like the current pathname.
    * `lucide-react`: For icons.
    * `next-auth/react`: For NextAuth authentication functions like `signOut`.
* **Removed Dependencies (SQLITE-024):**
    * ~~`@/lib/firebase`~~ - Firebase auth services removed, now using NextAuth.js
    * ~~`firebase/auth`~~ - Firebase auth functions removed, now using `next-auth/react`

## 3. Public API / Exports

* `AppShell`: A React component that wraps the main content of authenticated pages, providing the application's navigation and layout structure.

## 4. Code File Breakdown

### 4.1. `AppShell.tsx`

* **Purpose:** This file defines the `AppShell` component, which is the main layout for authenticated users. It integrates a responsive sidebar for navigation, a header with language selection, and a user profile dropdown with a logout option. It also includes a notification system for pending daily tasks. **Updated in SQLITE-024** to use NextAuth.js for authentication instead of Firebase Auth.
* **Functions:**
    * `AppShell({ children: ReactNode })`: The main component function that renders the entire application shell. It takes page content as `children` and places it within the main content area.
    * `handleLogout(): Promise<void>` - **Updated in SQLITE-024**: Signs the user out using NextAuth.js `signOut()` function with automatic redirect to `/login` via `callbackUrl` parameter. Previously used Firebase authentication. Logs any errors to the console.
* **Layout Fix (Task 1.3 - 2025-11-19)**: Fixed horizontal scroll overflow issue by migrating `SidebarProvider` from Flex to CSS Grid layout in `src/components/ui/sidebar.tsx`. The root cause was using `w-full` (100vw) on a flex container with a fixed 256px sidebar, resulting in total width exceeding viewport. The Grid solution uses `grid-template-columns: var(--sidebar-width) 1fr` which automatically calculates remaining space without manual width calculations. This is the 2025 industry best practice for fixed sidebar + flexible content layouts.
* **Key Classes / Constants / Variables:**
    * `navItems`: A constant array of objects that defines the structure of the main navigation menu. Each object contains a path (`href`), a translation key for the label (`labelKey`), an `icon`, a `windowShape` for traditional Chinese window styling, and an optional `badge` for notifications.
    * `hasIncompleteTasks`: A state variable (`boolean`) that tracks whether the currently logged-in user has any pending daily tasks. This is used to display a notification dot on the "Daily Tasks" navigation item.

### 4.2. `ChineseWindowNavButton` (Traditional Chinese Window Navigation)

* **Purpose:** This component renders navigation buttons styled as traditional Chinese window frames. It provides culturally-appropriate hover effects using different window shapes that carry symbolic meanings.
* **Window Shapes and Symbolism:**
    * `circular` (月門/Moon Gate): Represents completeness and harmony - used for Dashboard and Community
    * `hexagonal` (六角窗/Hexagonal Window): Represents six directions of exploration - used for Reading
    * `octagonal` (八角窗/Octagonal Window): Represents eight trigrams (八卦) - used for Daily Tasks challenge
    * `quatrefoil` (四葉窗/Quatrefoil Window): Represents four seasons cycle - used for Achievements progress
* **Props:**
    * `icon: LucideIcon`: Icon component to display
    * `label: string`: Text label for the navigation item
    * `href: string`: Route path for navigation
    * `isActive: boolean`: Whether this item is the current active page
    * `windowShape: WindowShape`: The traditional window frame shape to use
    * `badge?: boolean | number`: Optional notification indicator
    * `tooltip?: string`: Optional tooltip text

### 4.3. Active Path Logic

* **Special Edge Case:** The `/read-book` path should highlight the `/read` navigation item, allowing users to see they're still in the "reading" section while viewing a specific book. This is handled by:
  ```typescript
  const isActive =
    pathname === item.href ||
    (pathname.startsWith(item.href + '/') && item.href !== '/') ||
    (pathname === '/read-book' && item.href === '/read');
  ```

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: AppShell Component Renders] --> B{User Authenticated?};
    B -- Yes --> C[Render Main Layout];
    B -- No --> D[Render Login Button in Footer];
    
    C --> E[Fetch Daily Task Progress];
    E --> F{Has Incomplete Tasks?};
    F -- Yes --> G[Set `hasIncompleteTasks` to true];
    F -- No --> H[Set `hasIncompleteTasks` to false];
    
    G --> I[Display Notification Badge on Nav];
    H --> J[Render Navigation without Badge];
    
    subgraph "User Interaction"
        K[User Clicks Logout] --> L[Call `handleLogout()`];
        L --> M[Call NextAuth signOut with callbackUrl];
        M --> N[NextAuth clears session & redirects to /login];

        O[User Clicks Nav Item] --> P[Use Next.js Link to Navigate];

        Q[User Changes Language] --> R[Call `setLanguage()`];
        R --> S[Re-render UI with New Translations];
    end
    
    I & J --> T[Render Page Content via `children` prop]
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Input(User Auth State) -- from `useAuth` hook --> Mod(AppShell Component);
    Input2(Language State) -- from `useLanguage` hook --> Mod;
    Input3(Page Content) -- as `children` prop --> Mod;

    Mod -- User ID --> Service[`dailyTaskService.getUserDailyProgress()`];
    Service -- Daily Task Progress --> Mod;
    Mod -- Transforms Progress to `hasIncompleteTasks` boolean --> Nav(Sidebar Navigation);
    
    Mod -- Renders `children` --> Output(Displayed Page);
    Mod -- User Info --> UserMenu(User Dropdown Menu);
```

## 6. Usage Example & Testing

* **Usage:** The `AppShell` component is typically used in a root layout file for authenticated routes to wrap the page content.
  ```typescript
  // In a layout file for authenticated routes (e.g., /src/app/(main)/layout.tsx)
  import { AppShell } from '@/components/layout/AppShell';

  export default function MainLayout({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>;
  }
  ```
* **Testing:** This component is primarily tested through integration tests that verify navigation, authentication state changes, and responsive behavior. Unit tests could be added for specific logic like the active path determination or logout handling by mocking the required hooks and services.

---

**Document Version:** 2.0
**Last Updated:** 2025-11-30
**Changes in v2.0:**
- Added `ChineseWindowNavButton` component documentation with window shapes and symbolism
- Updated dependency from `daily-task-service` to `daily-task-client-service`
- Added `@/components/ui/chinese-window-nav-button` and `@/types/chinese-window` dependencies
- Added Active Path Logic section documenting `/read-book` → `/read` highlighting edge case
- Updated `navItems` description to include `windowShape` property
