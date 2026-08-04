# PickBoard Design System

## Overview

PickBoard evokes a late-night analysis room: an obsidian draft board, deep-blue structure, and precise brass markers. The visual system is restrained and dense because the user is making time-sensitive decisions beside the League client.

## Theme

- Dark-only for the MVP.
- Color strategy: restrained. Gold is reserved for primary actions, focus, and selection; blue organizes navigation and team context.
- Surfaces stay nearly neutral so champion artwork remains legible.
- Motion communicates state changes only and lasts 150–200 ms.

## Color Palette

All colors use OKLCH.

- `--color-bg`: `oklch(0.105 0 0)`
- `--color-surface`: `oklch(0.155 0.012 255)`
- `--color-surface-raised`: `oklch(0.205 0.018 255)`
- `--color-ink`: `oklch(0.94 0.006 85)`
- `--color-muted`: `oklch(0.71 0.018 255)`
- `--color-primary`: `oklch(0.78 0.15 75)`
- `--color-primary-strong`: `oklch(0.68 0.14 70)`
- `--color-accent`: `oklch(0.59 0.15 248)`
- `--color-success`: `oklch(0.72 0.14 155)`
- `--color-warning`: `oklch(0.78 0.15 75)`
- `--color-danger`: `oklch(0.65 0.18 25)`

## Typography

- Family: Inter with a system sans-serif fallback.
- Body: 0.875rem / 1.4.
- Small labels: 0.75rem / 1.3, medium weight.
- Page title: 1.25rem / 1.2, semibold.
- UI controls use sentence case in Portuguese. Short draft role labels may use uppercase.

## Layout

- Desktop shell with a compact 72px navigation rail and a flexible work area.
- Draft board uses two mirrored team columns with a central action strip at wide sizes.
- At 1366×768, spacing and card heights compress without hiding core controls.
- Champion picker is a fixed right-side dialog panel with its own scroll area.
- Settings and pools use one primary content surface, avoiding nested cards.

## Components

- Buttons: 8px radius, consistent 36px default height, visible focus ring.
- Inputs: 8px radius, raised surface, 1px neutral border only.
- Draft slots: horizontal artwork-first rows with role, champion, replace, and clear actions.
- LCU status: compact text-and-dot indicator; connection state never depends on color alone.
- Unassigned enemy picks: a short local annotation area, horizontal and scrollable in compact mode.
- Ban slots: compact square artwork cells with explicit empty and unavailable states.
- Toasts: fixed lower-right, short status copy, no required dismissal.
- Confirmation dialogs: native semantic dialog, focused destructive or consequential action.

## Accessibility

- Text contrast targets WCAG 2.1 AA or better.
- Focus rings use a high-contrast gold outline with spacing.
- Disabled and unavailable states include text or icon labels, never color alone.
- All primary workflows are operable by keyboard.
- Reduced-motion mode removes transforms and makes transitions immediate.
