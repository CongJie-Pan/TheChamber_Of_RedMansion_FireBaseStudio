
# Module: `Custom Hooks`

## 1. Module Summary

This module provides a collection of custom React hooks designed to encapsulate and reuse stateful logic across different components. These hooks simplify access to global contexts (like Authentication and Language) and provide common utility functions (like mobile detection), promoting cleaner component code and better separation of concerns.

## 2. Module Dependencies

* **Internal Dependencies:**
    * `@/context/AuthContext`: The React context for authentication.
    * `@/context/LanguageContext`: The React context for internationalization.
* **External Dependencies:**
    * `react`: Core library for building the UI.
    * `next-auth/react`: NextAuth.js authentication library for React (Phase 4 - SQLITE-022).

## 3. Public API / Exports

* `useAuth()`: A hook that provides access to the authentication state and methods.
* `useLanguage()`: A hook that provides access to the language state and translation function.
* `useIsMobile()`: A hook that detects if the current viewport is of mobile size.

## 4. Code File Breakdown

### 4.1. `useAuth.ts`

* **Purpose:** This hook is the primary interface for components to interact with the authentication system (Phase 4 - SQLITE-022). It abstracts the complexity of accessing the `AuthContext` and provides a clean API for getting the current user from NextAuth.js, accessing SQLite user profile data (level, XP, guest status), checking loading states, and performing logout operations. Authentication methods (login/register) have been moved to dedicated pages that call NextAuth `signIn()` directly. It also includes error handling and localized error messages.
* **Functions:**
    * `useAuth(): object` - The main hook function that returns the authentication state and action methods.
* **Key Classes / Constants / Variables:**
    * This file primarily exports the `useAuth` function, which internally uses `useContext` to connect to the `AuthContext`.

### 4.2. `useLanguage.ts`

* **Purpose:** This hook provides a simple and safe way for components to access the application's language state and translation capabilities. It connects to the `LanguageContext` and returns the current language, a function to set the language, and the translation function `t`. It includes an error check to ensure it is used within a `LanguageProvider`.
* **Functions:**
    * `useLanguage(): object` - The main hook function that returns the language state and translation function.
* **Key Classes / Constants / Variables:**
    * This file exports the `useLanguage` function.

### 4.3. `use-mobile.tsx`

* **Purpose:** This hook provides a boolean flag indicating whether the current browser viewport is considered "mobile" (less than 768px wide). It uses the browser's `matchMedia` API for efficient, performant detection of screen size changes. This allows components to easily render different layouts or enable different behaviors for mobile vs. desktop users.
* **Functions:**
    * `useIsMobile(): boolean` - The main hook function that returns `true` if the viewport is mobile-sized.
* **Key Classes / Constants / Variables:**
    * `MOBILE_BREAKPOINT`: A constant set to 768, defining the pixel width threshold for mobile detection.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    subgraph UI Components
        A[Any Component]
    end

    subgraph Custom Hooks Module
        B[useAuth()]
        C[useLanguage()]
        D[useIsMobile()]
    end

    subgraph React Context Module
        E[AuthContext]
        F[LanguageContext]
    end

    subgraph Browser
        G[matchMedia API]
    end

    A -- Calls --> B;
    A -- Calls --> C;
    A -- Calls --> D;

    B -- useContext() --> E;
    C -- useContext() --> F;
    D -- useEffect() & useState() --> G;

    E -- Provides Auth State --> B;
    F -- Provides Language State --> C;
    G -- Provides Viewport State --> D;

    B -- Returns Auth State & Methods --> A;
    C -- Returns Language State & t() --> A;
    D -- Returns isMobile boolean --> A;
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    subgraph Contexts
        AuthContext[Auth Context]
        LanguageContext[Language Context]
    end

    subgraph Hooks [Custom Hooks Module]
        useAuth[useAuth.ts]
        useLanguage[useLanguage.ts]
        useIsMobile[use-mobile.tsx]
    end

    subgraph Components
        Component(UI Component)
    end

    subgraph BrowserAPIs
        Browser(Browser APIs)
    end

    AuthContext -- Raw Auth Data --> useAuth;
    useAuth -- Formatted Auth Data & Functions --> Component;

    LanguageContext -- Raw Language Data --> useLanguage;
    useLanguage -- Language State & t() --> Component;

    Browser -- Viewport Width --> useIsMobile;
    useIsMobile -- isMobile: boolean --> Component;
```

## 6. Usage Example & Testing

* **Usage (Phase 4 - SQLITE-022):**
  ```typescript
  import { useAuth } from '@/hooks/useAuth';
  import { useLanguage } from '@/hooks/useLanguage';
  import { useIsMobile } from '@/hooks/use-mobile';

  function MyResponsiveComponent() {
    const { user, userProfile, logout } = useAuth();
    const { t } = useLanguage();
    const isMobile = useIsMobile();

    // NextAuth user properties: user.id, user.name, user.email, user.image
    // SQLite user profile: userProfile.currentLevel, userProfile.totalXP, userProfile.isGuest

    if (isMobile) {
      return (
        <div>
          {t('hello')}, {user?.name}! (Mobile View)
          <p>Level: {userProfile?.currentLevel} | XP: {userProfile?.totalXP}</p>
          <button onClick={logout}>{t('logout')}</button>
        </div>
      );
    }
    return (
      <div>
        {t('hello')}, {user?.name}! (Desktop View)
        <p>Level: {userProfile?.currentLevel} | XP: {userProfile?.totalXP}</p>
        <button onClick={logout}>{t('logout')}</button>
      </div>
    );
  }
  ```
* **Testing:** Custom hooks are tested in two main ways: 1) Directly, using a testing utility like `@testing-library/react-hooks` to render the hook and assert its return values. 2) Indirectly, by testing components that use the hook and mocking the context they depend on. For example, a component using `useAuth` can be tested by wrapping it in a mock `AuthProvider`.

---

## 7. Changelog

### 2025-10-30 - SQLITE-023: UI Components NextAuth Migration
**Changes:**
- All UI components (8 files) updated to use NextAuth user properties
- Property mapping applied across codebase:
  - `user.uid` → `user.id` (54 instances)
  - `user.displayName` → `user.name` (12 instances)
  - `user.isAnonymous` → `userProfile?.isGuest` (5 instances)
- Files updated: account-settings, daily-tasks, notes, community, read-book pages; AppShell, DailyTasksSummary, UserProfile components
- **Impact:** All components now consistently use `useAuth()` hook with NextAuth session data
- **Verification:** 0 Firebase user properties remaining in UI layer
- **Documentation:** SQLITE-023_COMPLETION_SUMMARY.md created

### 2025-10-30 - SQLITE-022: AuthContext NextAuth Migration
**Changes:**
- `useAuth()` hook updated to work with NextAuth.js instead of Firebase
- Removed Firebase authentication methods (signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest)
- Updated `getUserDisplayInfo()` to return NextAuth user properties
- Hook now returns: `{ user, userProfile, isLoading, refreshUserProfile, logout, getUserDisplayInfo }`
- `user` object structure changed: Firebase User → NextAuth Session User
- **Impact:** Components using `useAuth()` must access `userProfile` for guest status

### Earlier
- Initial implementation with Firebase Authentication
- Hooks created: `useAuth()`, `useLanguage()`, `useIsMobile()`
