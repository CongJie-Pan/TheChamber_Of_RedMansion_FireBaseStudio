# Module: `checkbox`

## 1. Module Summary

The `checkbox` module provides a styled checkbox component. It is a wrapper around the Radix UI `Checkbox` primitive, providing the necessary styles to match the application's design system and ensuring accessibility.

## 2. Module Dependencies

* **Internal Dependencies:**
    * `@/lib/utils`: For the `cn` utility function.
* **External Dependencies:**
    * `react`: For component creation and forwarding refs.
    * `@radix-ui/react-checkbox`: The underlying headless component.
    * `lucide-react`: For the `Check` icon.

## 3. Public API / Exports

* `Checkbox(props: CheckboxProps)`: The main component that renders the checkbox.

## 4. Code File Breakdown

### 4.1. `checkbox.tsx`

* **Purpose:** This file exports a styled `Checkbox` component built upon the Radix UI `Checkbox` primitive.
* **Functions:**
    * `Checkbox`: A `React.forwardRef` component that wraps `CheckboxPrimitive.Root` and includes the `Check` icon inside the `CheckboxPrimitive.Indicator`.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

This component's logic is handled by the Radix UI primitive.

```mermaid
flowchart TD
    A[Start: Render `Checkbox`] --> B{User clicks the checkbox};
    B --> C[Radix UI handles state change (checked/unchecked)];
    C --> D[The `onCheckedChange` callback is triggered];
    D --> E[Component re-renders with the new state];
    E --> F[End];
```

### 5.2. Data Flow Diagram (Data Transformation)

This component's primary data is its checked state.

```mermaid
graph LR
    Input(Props like `checked`, `onCheckedChange`) -- Passed to --> Mod(Module: `checkbox`);
    Mod -- Renders UI --> User;
    User -- Clicks checkbox --> Lib([@radix-ui/react-checkbox]);
    Lib -- Triggers `onCheckedChange` with new state --> Output(Parent Component State);
```

## 6. Usage Example & Testing

* **Usage:**
  ```tsx
  import { Checkbox } from "@/components/ui/checkbox";

  <div className="flex items-center space-x-2">
    <Checkbox id="terms" />
    <label htmlFor="terms">Accept terms and conditions</label>
  </div>
  ```
* **Testing:** Testing in `tests/components/ui/checkbox.test.tsx` would involve verifying that the checkbox can be checked and unchecked, and that the `onCheckedChange` callback is fired with the correct boolean value upon interaction.
