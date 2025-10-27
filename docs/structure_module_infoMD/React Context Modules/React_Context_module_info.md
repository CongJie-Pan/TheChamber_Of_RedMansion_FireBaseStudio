
# Module: `React Context`

## 1. Module Summary

This module provides global state management for the application using React's Context API. It is responsible for managing and distributing application-wide state for user authentication and language preferences, making this data accessible to any component in the tree without prop drilling.

## 2. Module Dependencies

* **Internal Dependencies:**
    * `@/lib/firebase`: Firebase configuration.
    * `@/components/ui/skeleton`: UI component for loading states.
    * `@/lib/types/user-level`: TypeScript types for user profiles.
    * `@/lib/user-level-service`: Service for user profile management.
    * `@/lib/translations`: Internationalization configuration and functions.
* **External Dependencies:**
    * `react`: Core library for building the UI.
    * `firebase/auth`: Firebase Authentication library.
    * `firebase/firestore`: Firebase Firestore library.

## 3. Public API / Exports

* `AuthContext`: A React context that provides authentication state (`user`, `userProfile`, `isLoading`).
* `AuthProvider`: A component that provides the `AuthContext` to its children.
* `LanguageContext`: A React context that provides language state (`language`, `setLanguage`, `t`).
* `LanguageProvider`: A component that provides the `LanguageContext` to its children.

## 4. Code File Breakdown

### 4.1. `AuthContext.tsx`

* **Purpose:** This file implements the authentication context and provider for the application. It manages the user's session state by interfacing with Firebase Authentication, fetches and provides the user's profile data (including level and XP), and handles the initial loading state. This provider is intended to wrap the entire application to provide universal access to authentication status.
* **Functions:**
    * `AuthProvider({ children }: AuthProviderProps)`: The main provider component that manages and provides the authentication state.
* **Key Classes / Constants / Variables:**
    * `AuthContext`: The React Context object created to hold and transmit authentication data.

### 4.2. `LanguageContext.tsx`

* **Purpose:** This file implements the context and provider for managing the application's internationalization (i18n) state. It allows users to switch between Traditional Chinese, Simplified Chinese, and English, persists the selection in `localStorage`, and provides a translation function `t` to the entire component tree. This setup ensures that all UI text can be dynamically updated when the language is changed.
* **Functions:**
    * `LanguageProvider({ children }: LanguageProviderProps)`: The main provider component that manages and provides the language state and translation function.
* **Key Classes / Constants / Variables:**
    * `LanguageContext`: The React Context object created to hold and transmit language preferences and the translation function.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Application Root: layout.tsx] --> B(AuthProvider);
    B --> C(LanguageProvider);
    C --> D{App Components};

    subgraph AuthProvider Logic
        E[onAuthStateChanged Listener] --> F{User Logged In?};
        F -- Yes --> G[loadUserProfile];
        F -- No --> H[Clear User Profile];
        G --> I[Set User & Profile];
    end

    subgraph LanguageProvider Logic
        J[useState Initialization] --> K{Check localStorage};
        K -- Found --> L[Set Language from Storage];
        K -- Not Found --> M[Set Default Language];
    end

    D -- Uses useAuth() hook --> B;
    D -- Uses useLanguage() hook --> C;
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    subgraph External
        Firebase[(Firebase Auth)]
        Firestore[(Firestore DB)]
        Browser[Browser localStorage]
    end

    subgraph ContextModule [React Context Module]
        AuthProvider[AuthContext.tsx]
        LangProvider[LanguageContext.tsx]
    end

    subgraph UI
        AppComponent(Application Components)
    end

    Firebase -- Auth State --> AuthProvider;
    Firestore -- User Profile Data --> AuthProvider;
    AuthProvider -- AuthData (user, profile) --> AppComponent;

    Browser -- Stored Language --> LangProvider;
    LangProvider -- Language & t() --> AppComponent;
    AppComponent -- Calls setLanguage --> LangProvider;
    LangProvider -- Persists Language --> Browser;
```

## 6. Usage Example & Testing

* **Usage:**
  ```typescript
  // In a component
  import { useAuth } from '@/hooks/useAuth';
  import { useLanguage } from '@/hooks/useLanguage';

  function UserProfileDisplay() {
    const { user } = useAuth();
    const { t } = useLanguage();

    return <h1>{t('welcome')}, {user?.displayName}!</h1>;
  }
  ```
* **Testing:** This module is primarily tested through integration tests that wrap components with the `AuthProvider` and `LanguageProvider`. Tests in files like `login-functionality.test.tsx` verify that components react correctly to changes in authentication state. Similarly, UI tests can assert that text content changes when the language is switched.
