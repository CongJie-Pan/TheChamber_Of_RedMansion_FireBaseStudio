# UI Component Modules — Compact Summary

This document compacts the individual module infos under `docs/structure_module_infoMD/UI Component Modules` into a concise, complete reference.

## AIMessageBubble
- Purpose: Displays an AI response bubble with collapsible thinking process, final answer, and citations.
- Internal deps: `@/lib/utils`, `@/types/perplexity-qa`, `./StructuredQAResponse`.
- External deps: `react`, `lucide-react`.
- Public API: `AIMessageBubble(props)` (default export).
- File: `AIMessageBubble.tsx`.
- Usage: Render with `answer`, `citations`, `thinkingProcess`, `isThinkingComplete`.
- Tests: Collapsible behavior, streaming indicator, answer/citation rendering.

## ConversationFlow
- Purpose: Chat-style conversation UI rendering user/AI/system messages with avatars, timestamps, auto-scroll, and separators. Includes improved empty state visibility for dark theme compatibility.
- Internal deps: `@/lib/utils`, `@/types/perplexity-qa`.
- External deps: `react`, `date-fns`, `lucide-react`.
- Public API: `ConversationFlow(props)`, `createConversationMessage(...)`, types `ConversationMessage`, `MessageRole`.
- File: `ConversationFlow.tsx`.
- Usage: Maintain `messages: ConversationMessage[]`; render `<ConversationFlow messages={messages} />`.
- Tests: Roles/styling, empty state, auto-scroll, `createConversationMessage` factory.
- **Task 4.2 Update (2025-11-30):** Empty state styling improved with better contrast colors (`text-foreground/80`), border (`border-border/30`), background (`bg-background/20`), and minimum height (`min-h-[200px]`) for enhanced visibility in dark theme.

## StructuredQAResponse
- Purpose: Renders structured QA answers with numbered sections, inline clickable citations, and a references list. Includes improved empty content fallback styling for dark theme compatibility.
- Internal deps: `@/types/perplexity-qa`, `@/lib/utils`.
- External deps: `react`, `react-markdown`, `lucide-react`.
- Public API: `StructuredQAResponse(props)`, `processContentWithCitations(content, ...)`, types `StructuredSection`.
- File: `StructuredQAResponse.tsx`.
- Usage: Provide `sections` or `rawContent` and `citations`; optional `onCitationClick`.
- Tests: Citation parsing/injection, click handler, sections vs raw rendering.
- **Task 4.2 Update (2025-11-30):** Empty content fallback improved with Chinese text ("內容載入中..." for inline empty content; "AI 回答載入中..." for fallback section) and enhanced visibility styling using `text-foreground/70`, `border border-border/30`, and `bg-background/20` for better contrast in dark theme.

## ThinkingProcessIndicator
- Purpose: Visualizes AI thinking status with optional progress and collapsible detailed content; includes compact badge.
- Internal deps: `@/lib/utils`.
- External deps: `react`, `lucide-react`.
- Public API: `ThinkingProcessIndicator(props)`, `ThinkingProcessBadge(props)`, type `ThinkingStatus`.
- File: `ThinkingProcessIndicator.tsx`.
- Usage: `<ThinkingProcessIndicator status="thinking" content="..." progress={50} />`.
- Tests: Status configs, expand/collapse, progress rendering.

## accordion
- Purpose: Styled wrapper around Radix `Accordion` with trigger, content, and animations.
- Internal deps: `@/lib/utils`.
- External deps: `react`, `@radix-ui/react-accordion`, `lucide-react`.
- Public API: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`.
- File: `accordion.tsx`.
- Usage: Single/multiple accordion with items and content.
- Tests: Render and styling; basic interaction via snapshot/RTL.

## alert-dialog
- Purpose: Modal dialog for important confirmations; blocks background interaction.
- Internal deps: `@/lib/utils`, `@/components/ui/button`.
- External deps: `react`, `@radix-ui/react-alert-dialog`.
- Public API: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`.
- File: `alert-dialog.tsx`.
- Usage: Wrap content in `AlertDialog`; place actions in footer.
- Tests: Open/close, action/cancel handlers, focus return.

## alert
- Purpose: Styled alert container with title and description; supports variants (default/destructive).
- Internal deps: `@/lib/utils`.
- External deps: `react`, `class-variance-authority`.
- Public API: `Alert`, `AlertTitle`, `AlertDescription`.
- File: `alert.tsx`.
- Usage: Combine with icon and message; set variant.
- Tests: Variant classes via snapshot; basic render.

## avatar
- Purpose: Avatar image with graceful fallback content using Radix Avatar primitive.
- Internal deps: `@/lib/utils`.
- External deps: `react`, `@radix-ui/react-avatar`.
- Public API: `Avatar`, `AvatarImage`, `AvatarFallback`.
- File: `avatar.tsx`.
- Usage: Provide `src` to `AvatarImage`; fallback content/initials in `AvatarFallback`.
- Tests: Image vs fallback rendering across load states.

## badge
- Purpose: Small label/badge with semantic variants.
- Internal deps: `@/lib/utils`.
- External deps: `react`, `class-variance-authority`.
- Public API: `Badge(props)`, `badgeVariants`.
- File: `badge.tsx`.
- Usage: `<Badge variant="destructive">Urgent</Badge>`.
- Tests: Variant styling via snapshot.

## button
- Purpose: Reusable button with variant and size styles; supports `asChild` via Radix Slot.
- Internal deps: `@/lib/utils`.
- External deps: `react`, `@radix-ui/react-slot`, `class-variance-authority`.
- Public API: `Button(props)`, `buttonVariants`.
- File: `button.tsx`.
- Usage: Set `variant`, `size`, and optionally `asChild`.
- Tests: Variant/size classes; `onClick` interactions.

## calendar
- Purpose: Themed date picker built on `react-day-picker` with custom navigation and range styles.
- Internal deps: `@/lib/utils`, `@/components/ui/button`.
- External deps: `react`, `lucide-react`, `react-day-picker`.
- Public API: `Calendar(props: CalendarProps)`.
- File: `calendar.tsx`.
- Usage: Controlled `selected` and `onSelect`; set `mode` (e.g., `single`).
- Tests: Render and `onSelect` callback fire.

## card
- Purpose: Layout container with header/title/description/content/footer sections.
- Internal deps: `@/lib/utils`.
- External deps: `react`.
- Public API: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- File: `card.tsx`.
- Usage: Compose sections to build information cards.
- Tests: Snapshot of structure and classes.

## chart
- Purpose: Recharts-based charting with themed context, tooltips, legends, and responsive layout.
- Internal deps: `@/lib/utils`.
- External deps: `react`, `recharts`.
- Public API: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`, type `ChartConfig`.
- File: `chart.tsx`.
- Usage: Wrap Recharts graph in `ChartContainer` with `config`; use provided tooltip/legend components.
- Tests: Context provisioning, tooltip/legend rendering, generated CSS snapshot.

## checkbox
- Purpose: Styled checkbox wrapping Radix Checkbox with accessible indicator.
- Internal deps: `@/lib/utils`.
- External deps: `react`, `@radix-ui/react-checkbox`, `lucide-react`.
- Public API: `Checkbox(props)`.
- File: `checkbox.tsx`.
- Usage: Controlled or uncontrolled; use `onCheckedChange`.
- Tests: Toggle behavior and callback values.

