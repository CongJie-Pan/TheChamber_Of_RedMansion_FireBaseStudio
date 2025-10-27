# Module: `ThinkingProcessIndicator`

## 1. Module Summary

The `ThinkingProcessIndicator` module provides a UI component to visualize the AI's thinking process. It displays the current status (e.g., "thinking", "complete"), can show a progress bar, and includes a collapsible section to reveal the detailed text of the AI's thought process.

## 2. Module Dependencies

* **Internal Dependencies:**
    * `@/lib/utils`: For the `cn` utility function.
* **External Dependencies:**
    * `react`: For component creation and state management.
    * `lucide-react`: For icons.

## 3. Public API / Exports

* `ThinkingProcessIndicator(props: ThinkingProcessIndicatorProps)`: The main component that renders the full indicator with a collapsible content area.
* `ThinkingProcessBadge(props: ...)`: A compact, inline version of the indicator that only shows the status badge.
* `ThinkingStatus`: A type for the status of the thinking process (`thinking`, `complete`, `error`, `idle`).

## 4. Code File Breakdown

### 4.1. `ThinkingProcessIndicator.tsx`

* **Purpose:** This file contains the implementation for both the full `ThinkingProcessIndicator` and the compact `ThinkingProcessBadge`.
* **Functions:**
    * `getStatusConfig(status: ThinkingStatus)`: Returns an object with the icon, label, colors, and class names for a given status.
    * `ThinkingProcessIndicator(props: ThinkingProcessIndicatorProps)`: The main component. It manages the expanded/collapsed state and renders the header, status, and collapsible content.
    * `ThinkingProcessBadge(props: ...)`: A smaller, badge-like component that only displays the current thinking status.
* **Key Classes / Constants / Variables:**
    * `ThinkingProcessIndicatorProps`: The interface for the main component's props.
    * `ThinkingStatus`: The type definition for the thinking status.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: Render `ThinkingProcessIndicator`] --> B{Get Status Config};
    B --> C[Render Header with Status Icon & Label];
    C --> D{Is `isExpandable` and has `content`?};
    D -- Yes --> E[Render Expand/Collapse Button];
    D -- No --> F[Render Content (if `alwaysVisible`)];
    E --> G{Is `isExpanded`?};
    G -- Yes --> H[Render Collapsible Content];
    G -- No --> I[Content is hidden];
    F --> J[End];
    H --> J;
    I --> J;
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Input(`status` and `content` props) -- Data --> Mod(Module: `ThinkingProcessIndicator`);
    Mod -- `status` --> Func[`getStatusConfig()`];
    Func -- Config (icons, colors, labels) --> Mod;
    Mod -- `content` --> ContentSection(Collapsible Content Area);
    Mod -- Formatted Data --> Output(Rendered JSX Indicator);
```

## 6. Usage Example & Testing

* **Usage:**
  ```tsx
  import { ThinkingProcessIndicator } from '@/components/ui/ThinkingProcessIndicator';

  <ThinkingProcessIndicator
    status="thinking"
    content="First, I will analyze the user's query..."
    progress={50}
  />
  ```
* **Testing:** Unit tests for this component would be in `tests/components/ui/ThinkingProcessIndicator.test.tsx`. They would cover the different status displays, the expand/collapse functionality, and the correct rendering of the progress bar.
