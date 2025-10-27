# Module: `StreakCounter`

## 1. Module Summary

The `StreakCounter` module is a visual component designed to display the user's current streak of consecutive daily task completions. It provides motivational feedback by showing the streak number, highlighting achieved milestones, and indicating the next upcoming milestone.

## 2. Module Dependencies

* **Internal Dependencies:**
    * `@/components/ui/card`: For the main card structure.
    * `@/components/ui/badge`: To display achieved milestones.
    * `@/lib/utils`: For the `cn` utility function.
* **External Dependencies:**
    * `react`: For component creation.
    * `lucide-react`: For icons (`Flame`, `Trophy`, `Award`).

## 3. Public API / Exports

* `StreakCounter: React.FC<StreakCounterProps>`: The main component that renders the streak counter.

## 4. Code File Breakdown

### 4.1. `StreakCounter.tsx`

* **Purpose:** This file contains the implementation of the `StreakCounter` component, which visualizes the user's daily task streak.
* **Functions:**
    * `getNextMilestone(currentStreak: number)`: Determines the next milestone the user is working towards.
    * `getAchievedMilestones(currentStreak: number)`: Returns a list of milestones the user has already achieved.
    * `StreakCounter(props: StreakCounterProps): JSX.Element`: The main React component. It takes the current streak as a prop and renders the counter with different sizes and milestone indicators.
* **Key Classes / Constants / Variables:**
    * `StreakCounterProps`: The interface for the component's props.
    * `MILESTONES`: A constant array defining the streak milestones (e.g., 7, 30, 100 days).

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: Render `StreakCounter` with `currentStreak`] --> B[Get Achieved & Next Milestones];
    B --> C{Select Size Variant};
    C -- 'small' --> D[Render Small Card];
    C -- 'medium' --> E[Render Medium Card];
    C -- 'large' --> F[Render Large Card];
    D --> G[End];
    E --> G;
    F --> G;
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Input(`currentStreak` prop) -- Number --> Mod(Module: `StreakCounter`);
    Mod -- `currentStreak` --> Func1[`getNextMilestone()`];
    Func1 -- Next Milestone --> Mod;
    Mod -- `currentStreak` --> Func2[`getAchievedMilestones()`];
    Func2 -- Achieved Milestones --> Mod;
    Mod -- Formatted Data --> Output(Rendered JSX Card with streak info);
```

## 6. Usage Example & Testing

* **Usage:**
  ```tsx
  import { StreakCounter } from '@/components/daily-tasks/StreakCounter';

  // To display a medium-sized streak counter
  <StreakCounter currentStreak={15} size="medium" />
  ```
* **Testing:** Unit tests for this component would be located in `tests/components/daily-tasks/StreakCounter.test.tsx`. Tests would verify that the correct milestones are displayed for different streak numbers and that the size variants render correctly.
