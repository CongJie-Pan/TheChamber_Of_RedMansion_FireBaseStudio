# Module: `LevelProgressBar`

## 1. Module Summary

The `LevelProgressBar` module provides a dynamic and animated progress bar to visualize a user's experience points (XP) progression towards the next level. It's a key motivational component in the gamification system, giving users clear and immediate feedback on their advancement.

## 2. Module Dependencies

* **Internal Dependencies:**
    * `@/components/ui/progress`: The underlying progress bar component from the UI library.
    * `@/hooks/useAuth`: To access the user's current and next level XP.
    * `@/hooks/useLanguage`: For internationalizing labels.
    * `@/lib/utils`: For the `cn` utility function.
* **External Dependencies:**
    * `react`: For component creation and state management.

## 3. Public API / Exports

* `LevelProgressBar(props: LevelProgressBarProps)`: The main component function that renders the XP progress bar.

## 4. Code File Breakdown

### 4.1. `LevelProgressBar.tsx`

* **Purpose:** This file contains the logic for the `LevelProgressBar` component, including calculating the progress percentage, handling animations, and displaying XP labels.
* **Functions:**
    * `calculateProgressPercentage(current: number, total: number): number`: Calculates the user's progress towards the next level as a percentage.
    * `formatXP(xp: number): string`: Formats a number into a comma-separated string for readability.
    * `getProgressColor(percentage: number): string`: Returns a Tailwind CSS color class based on the progress percentage.
    * `LevelProgressBar(props: LevelProgressBarProps): JSX.Element`: The main component. It fetches user XP data, calculates progress, and renders the animated progress bar with optional labels.
* **Key Classes / Constants / Variables:**
    * `LevelProgressBarProps`: The interface for the component's props.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: Render `LevelProgressBar`] --> B{useAuth()};
    B -- isLoading --> C[Render Loading Skeleton];
    B -- Has userProfile --> D[Get XP values];
    D --> E[Calculate Progress Percentage];
    E --> F[Get Progress Color];
    F --> G{Show Labels?};
    G -- Yes --> H[Render Labels and Progress Bar];
    G -- No --> I[Render Progress Bar Only];
    H --> J[End];
    I --> J;
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Input(User Profile or XP props) -- XP Data --> Mod(Module: `LevelProgressBar`);
    Mod -- currentXP, nextLevelXP --> Func1[`calculateProgressPercentage()`];
    Func1 -- Percentage --> Mod;
    Mod -- Percentage --> Func2[`getProgressColor()`];
    Func2 -- Color Class --> Mod;
    Mod -- Formatted Data --> Output(Rendered JSX Progress Bar);
```

## 6. Usage Example & Testing

* **Usage:**
  ```tsx
  import { LevelProgressBar } from '@/components/gamification/LevelProgressBar';

  // To display a progress bar with XP labels
  <LevelProgressBar showLabels />
  ```
* **Testing:** Unit tests for this component would be located in `tests/components/gamification/LevelProgressBar.test.tsx`. The tests would cover correct percentage calculation, color changes, and the loading state.
