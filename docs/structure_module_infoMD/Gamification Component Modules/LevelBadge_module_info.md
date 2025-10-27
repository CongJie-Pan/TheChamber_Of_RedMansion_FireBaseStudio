# Module: `LevelBadge`

## 1. Module Summary

The `LevelBadge` module provides a reusable React component to display a user's level within the gamification system. It is designed to be visually appealing and easily integrable into various parts of the application, offering different visual variants to suit different UI contexts.

## 2. Module Dependencies

* **Internal Dependencies:**
    * `@/components/ui/badge`: For rendering the badge UI element.
    * `@/hooks/useAuth`: To access the authenticated user's profile and level.
    * `@/hooks/useLanguage`: For internationalization of level titles.
    * `@/lib/config/levels-config`: To fetch level-specific configuration like titles.
    * `@/lib/utils`: For utility functions like `cn` for merging CSS classes.
* **External Dependencies:**
    * `react`: For component creation and lifecycle.
    * `lucide-react`: For icons (`Trophy`, `Star`, `Sparkles`).

## 3. Public API / Exports

* `LevelBadge(props: LevelBadgeProps)`: The main component function that renders the level badge.

## 4. Code File Breakdown

### 4.1. `LevelBadge.tsx`

* **Purpose:** This file contains the implementation of the `LevelBadge` component, including its variants, styling logic, and data fetching from the user's profile.
* **Functions:**
    * `getLevelColorClasses(level: number): object`: Returns a set of Tailwind CSS classes for styling the badge based on the user's level tier.
    * `getLevelIcon(level: number): Component`: Returns a Lucide icon component appropriate for the user's level tier.
    * `LevelBadge(props: LevelBadgeProps): JSX.Element`: The main component function. It takes props to control its appearance and behavior, fetches the user's level, and renders the badge.
* **Key Classes / Constants / Variables:**
    * `LevelBadgeProps`: The interface defining the props for the `LevelBadge` component.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: Render `LevelBadge`] --> B{Check `level` prop};
    B -- Provided --> C[Use provided level];
    B -- Not Provided --> D{useAuth()};
    D -- isLoading --> E[Render Loading Skeleton];
    D -- has userProfile --> F[Use `userProfile.currentLevel`];
    F --> G[Get Level Config & Colors];
    C --> G;
    G --> H{Select Variant};
    H -- 'minimal' --> I[Render Minimal Badge];
    H -- 'compact' --> J[Render Compact Badge];
    H -- 'full' --> K[Render Full Badge];
    I --> L[End];
    J --> L;
    K --> L;
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Input(User Profile or `level` prop) -- Level (number) --> Mod(Module: `LevelBadge`);
    Mod -- Level --> Service1[`getLevelColorClasses()`];
    Service1 -- Color Classes --> Mod;
    Mod -- Level --> Service2[`getLevelIcon()`];
    Service2 -- Icon Component --> Mod;
    Mod -- Level --> Service3[`getLevelConfig()`];
    Service3 -- Level Title --> Mod;
    Mod -- Formatted Data --> Output(Rendered JSX Badge);
```

## 6. Usage Example & Testing

* **Usage:**
  ```tsx
  import { LevelBadge } from '@/components/gamification/LevelBadge';

  // To display a compact badge for the current user
  <LevelBadge variant="compact" />
  ```
* **Testing:** Unit tests for this component would be located in `tests/components/gamification/LevelBadge.test.tsx` and would cover all variants and states (loading, different levels).
