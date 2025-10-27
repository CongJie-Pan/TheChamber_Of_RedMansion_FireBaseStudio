# Module: `TaskResultModal`

## 1. Module Summary

The `TaskResultModal` is a component that displays the results of a completed daily task. It presents the user with their score, AI-generated feedback, XP and attribute rewards, and any streak bonuses. If the user levels up, it also triggers the `LevelUpModal`.

## 2. Module Dependencies

* **Internal Dependencies:**
    * `@/components/ui/dialog`: For the modal structure.
    * `@/components/ui/button`: For the close button.
    * `@/components/ui/badge`: For displaying the score description.
    * `@/components/ui/progress`: (Not directly used, but related to level progress).
    * `@/components/ui/separator`: For visual separation.
    * `@/lib/types/daily-task`: For the `TaskCompletionResult` type.
    * `@/components/gamification`: For the `LevelUpModal`.
    * `@/lib/utils`: For the `cn` utility function.
* **External Dependencies:**
    * `react`: For component creation, state, and effects.
    * `lucide-react`: For icons.

## 3. Public API / Exports

* `TaskResultModal: React.FC<TaskResultModalProps>`: The main component that renders the task result modal.

## 4. Code File Breakdown

### 4.1. `TaskResultModal.tsx`

* **Purpose:** This file contains the implementation of the `TaskResultModal` component, which is responsible for showing the user the outcome of their task submission.
* **Functions:**
    * `getScoreColor(score: number): string`: Returns a color class based on the score.
    * `getScoreDescription(score: number): string`: Returns a descriptive string for the score (e.g., "Excellent").
    * `getAttributeIcon(attributeName: string)`: Returns an icon for a given attribute.
    * `getAttributeName(attributeName: string): string`: Returns a human-readable name for an attribute.
    * `TaskResultModal(props: TaskResultModalProps): JSX.Element`: The main React component. It animates the score, displays all rewards, and triggers the level-up modal if necessary.
* **Key Classes / Constants / Variables:**
    * `TaskResultModalProps`: The interface for the component's props.
    * `showLevelUp`: State to control the visibility of the `LevelUpModal`.
    * `animatedScore`: State to animate the score display.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: `TaskResultModal` opens with `result`] --> B[Animate Score];
    B --> C[Display Score, Feedback, and Rewards];
    C --> D{Did user level up?};
    D -- Yes --> E[Show Level Up Preview & Schedule `LevelUpModal`];
    D -- No --> F[User clicks "Confirm"];
    E --> F;
    F --> G[Close Modal];
    G --> H[End];
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Input(`result` prop) -- TaskCompletionResult --> Mod(Module: `TaskResultModal`);
    Mod -- Score --> Func1[`getScoreColor()`];
    Func1 -- Color Class --> Mod;
    Mod -- Score --> Func2[`getScoreDescription()`];
    Func2 -- Description --> Mod;
    Mod -- Leveled Up? --> SubComponent([LevelUpModal]);
    Mod -- Formatted Data --> Output(Rendered JSX Modal);
```

## 6. Usage Example & Testing

* **Usage:**
  ```tsx
  import { TaskResultModal } from '@/components/daily-tasks/TaskResultModal';

  const [result, setResult] = useState(null);
  const [isResultModalOpen, setResultModalOpen] = useState(false);

  // After submitting a task and getting a result...
  setResult(completionResult);
  setResultModalOpen(true);

  <TaskResultModal
    result={result}
    open={isResultModalOpen}
    onClose={() => setResultModalOpen(false)}
  />
  ```
* **Testing:** Unit tests for this component would be in `tests/components/daily-tasks/TaskResultModal.test.tsx`. They would cover the correct display of different scores and rewards, and ensure that the `LevelUpModal` is triggered when the `leveledUp` flag is true in the result prop.
