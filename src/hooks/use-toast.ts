/**
 * @fileOverview Toast Notification System - React Hook Implementation
 *
 * This module provides a lightweight, flexible toast notification system inspired
 * by react-hot-toast. It implements a global state pattern with React hooks for
 * cross-component toast management without prop drilling or context overhead.
 *
 * Key features:
 * - Global toast state shared across all components
 * - Automatic toast lifecycle management (add → display → dismiss → remove)
 * - Concurrent toast limit to prevent UI overwhelming
 * - Automatic timeout removal for better UX
 * - Imperative API (toast()) and hook API (useToast())
 * - Type-safe with full TypeScript support
 *
 * Architecture pattern:
 * - Module-level state (memoryState) for global persistence
 * - Reducer pattern for predictable state transitions
 * - Listener pattern for reactive UI updates
 * - Separation of concerns: toast() for triggering, useToast() for consuming
 *
 * Design decisions:
 * - TOAST_LIMIT=2: Prevents notification fatigue, keeps UI clean
 * - TOAST_REMOVE_DELAY=5000ms: Balances readability and screen real estate
 * - Side effects in reducer: Acknowledged technical debt (see comment below)
 * - Unique ID generation: Circular counter with MAX_SAFE_INTEGER wrap
 *
 * Usage:
 * ```typescript
 * // Imperative API (anywhere in app)
 * import { toast } from '@/hooks/use-toast';
 * toast({ title: "Success", description: "Task completed" });
 *
 * // Hook API (in React components)
 * const { toast } = useToast();
 * toast({ title: "Error", variant: "destructive" });
 * ```
 *
 * @see {@link ../components/ui/toast.tsx} for UI implementation
 * @see {@link ../components/ui/toaster.tsx} for toast container
 *
 * Technical debt:
 * - Side effects (setTimeout) in reducer violates pure function principle
 * - Future refactor: Extract dismissToast() action to handle side effects
 */

"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

/**
 * Toast configuration constants
 *
 * Reason for TOAST_LIMIT = 2:
 * - Prevents notification spam (too many toasts = user ignores all)
 * - Keeps UI clean and focused on most recent/important messages
 * - Forces developers to consolidate related notifications
 * - Mobile devices have limited screen space
 * - FIFO queue ensures newest toasts are always visible
 *
 * Reason for TOAST_REMOVE_DELAY = 5000ms:
 * - 5 seconds is sufficient reading time for typical toast messages
 * - Shorter than 5s: Users might miss important info
 * - Longer than 5s: Toasts become visual clutter
 * - Aligns with UX best practices for transient notifications
 * - Users can still manually dismiss if needed
 */
const TOAST_LIMIT = 2
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

/**
 * Global counter for unique toast ID generation
 *
 * Reason for module-level variable:
 * - Ensures IDs are unique across all toast instances
 * - Persists between component mounts/unmounts
 * - No need for external ID library (reduces bundle size)
 */
let count = 0

/**
 * Generate unique toast ID
 *
 * Reason for circular counter pattern:
 * - Wraps at MAX_SAFE_INTEGER to prevent overflow
 * - Very unlikely to collide (would need 9 quadrillion toasts)
 * - Simpler than UUID/nanoid (no crypto dependency)
 * - String IDs work better with React keys
 * - Monotonically increasing helps with debugging
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

/**
 * Listener registry for reactive state updates
 *
 * Reason for listener pattern vs Context API:
 * - No Provider wrapper needed (simpler setup)
 * - Works outside React tree (can call toast() in utils, services)
 * - Lower overhead than Context (no virtual DOM diffing)
 * - Each component subscribes independently (fine-grained updates)
 * - Easier to debug (direct function calls vs Context propagation)
 */
const listeners: Array<(state: State) => void> = []

/**
 * Module-level state (singleton pattern)
 *
 * Reason for module-level state vs React state:
 * - Persists across component unmounts (toasts don't disappear)
 * - Single source of truth for all toast consumers
 * - No prop drilling required
 * - Survives React hot module replacement (better DX)
 * - Enables imperative API (toast() callable anywhere)
 */
let memoryState: State = { toasts: [] }

/**
 * Dispatch actions and notify listeners
 *
 * Reason for manual listener notification:
 * - Custom pub-sub pattern for React integration
 * - Each listener = one setState call in consuming component
 * - Batched by React's automatic batching (React 18+)
 * - Simpler than external state library (no dependency)
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
