# Module: `Layout Component Modules`

## 1. Module Summary

This module provides the primary layout structure for the authenticated sections of the application. It establishes a consistent user interface shell, including navigation, header, and content areas, ensuring a unified user experience across all protected pages.

## 2. Module Dependencies

* **Internal Dependencies:**
    * `@/components/ui/sidebar`: For the main sidebar structure.
    * `@/components/ui/button`: For interactive button elements.
    * `@/components/ui/separator`: For visual dividers.
    * `@/components/ui/dropdown-menu`: For user and language selection menus.
    * `@/hooks/useAuth`: To access user authentication state.
    * `@/hooks/useLanguage`: To manage internationalization.
    * `@/lib/firebase`: For Firebase authentication services.
    * `@/lib/daily-task-service`: To check for incomplete daily tasks.
    * `@/lib/translations`: For language definitions.
    * `@/lib/utils`: For utility functions like `cn`.
* **External Dependencies:**
    * `react`: For component creation and state management.
    * `next/link`: For client-side navigation.
    * `next/navigation`: To access routing information like the current pathname.
    * `lucide-react`: For icons.
    * `firebase/auth`: For authentication functions like `signOut`.

## 3. Public API / Exports

* `AppShell`: A React component that wraps the main content of authenticated pages, providing the application's navigation and layout structure.

## 4. Code File Breakdown

### 4.1. `AppShell.tsx`

* **Purpose:** This file defines the `AppShell` component, which is the main layout for authenticated users. It integrates a responsive sidebar for navigation, a header with language selection, and a user profile dropdown with a logout option. It also includes a notification system for pending daily tasks.
* **Functions:**
    * `AppShell({ children: ReactNode })`: The main component function that renders the entire application shell. It takes page content as `children` and places it within the main content area.
    * `handleLogout(): Promise<void>` - Signs the user out using Firebase authentication and redirects them to the `/login` page. It logs any errors to the console.
* **Key Classes / Constants / Variables:**
    * `navItems`: A constant array of objects that defines the structure of the main navigation menu. Each object contains a path (`href`), a translation key for the label (`labelKey`), an `icon`, and an optional `badge` for notifications.
    * `hasIncompleteTasks`: A state variable (`boolean`) that tracks whether the currently logged-in user has any pending daily tasks. This is used to display a notification dot on the "Daily Tasks" navigation item.

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
        L --> M[Sign Out from Firebase];
        M --> N[Redirect to /login];
        
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

