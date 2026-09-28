import { computed, ref } from 'vue';

// Where an arrow key, Home or End moves to in a group laid out in rows of
// `columns`; undefined for any other key. Moves stop at the ends, as in the
// ARIA toolbar and grid patterns, rather than wrapping round.
export function rovingTarget(
  key: string,
  index: number,
  count: number,
  columns = 1,
): number | undefined {
  switch (key) {
    case 'ArrowRight':
      return Math.min(index + 1, count - 1);
    case 'ArrowLeft':
      return Math.max(index - 1, 0);
    case 'ArrowDown':
      return index + columns < count ? index + columns : index;
    case 'ArrowUp':
      return index - columns >= 0 ? index - columns : index;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
}

function itemsOf(group: EventTarget | null): HTMLElement[] {
  return group instanceof HTMLElement
    ? Array.from(group.querySelectorAll<HTMLElement>('[data-roving]'))
    : [];
}

// One Tab stop for a long run of keys or rows (the ARIA "roving tabindex"
// pattern), so Tab moves past the whole group on its way to STOP ALL, and the
// arrow keys, Home and End move within it. Each item carries data-roving and
// takes its tabindex from here; the group listens for keydown and focusin.
export function useRovingFocus(options: {
  count: () => number;
  // How many items sit in a row; one for a plain list.
  columns?: (group: HTMLElement) => number;
  // A log that follows its newest line starts from the end.
  startAtEnd?: boolean;
}) {
  const chosen = ref<number>();

  const current = computed(() => {
    const count = options.count();
    const index = chosen.value ?? (options.startAtEnd ? count - 1 : 0);

    return Math.max(0, Math.min(index, count - 1));
  });

  function tabindex(index: number): 0 | -1 {
    return index === current.value ? 0 : -1;
  }

  // Clicking or tabbing to an item makes it the group's Tab stop.
  function onFocusin(event: FocusEvent): void {
    const index = itemsOf(event.currentTarget).indexOf(event.target as HTMLElement);

    if (index >= 0) {
      chosen.value = index;
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    const group = event.currentTarget as HTMLElement;
    const items = itemsOf(group);
    const from = items.indexOf(event.target as HTMLElement);

    // Keys typed into a field inside the group (a command's form) are the
    // field's own.
    if (from < 0) {
      return;
    }

    const to = rovingTarget(
      event.key,
      from,
      items.length,
      options.columns?.(group),
    );

    if (to === undefined) {
      return;
    }

    event.preventDefault();
    chosen.value = to;
    items[to]?.focus();
  }

  return { tabindex, onFocusin, onKeydown };
}
