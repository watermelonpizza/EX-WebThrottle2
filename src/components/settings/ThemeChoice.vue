<script setup lang="ts">
import type { ThemeName } from '@/stores/settings';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();

const OPTIONS: { value: ThemeName; label: string; hint: string }[] = [
  { value: 'dark', label: 'Dark', hint: 'For a train room lit for the layout' },
  { value: 'light', label: 'Light', hint: 'For bright rooms and daylight' },
  {
    value: 'contrast',
    label: 'High contrast',
    hint: 'Strongest contrast and larger text',
  },
];
</script>

<template>
  <section
    class="settings-section"
    aria-labelledby="theme-title"
  >
    <h2
      id="theme-title"
      class="settings-section__title"
    >
      Appearance
    </h2>

    <div
      class="themes"
      role="radiogroup"
      aria-labelledby="theme-title"
    >
      <label
        v-for="option in OPTIONS"
        :key="option.value"
        class="theme"
        :class="{ 'theme--chosen': settings.theme === option.value }"
        :data-theme="option.value"
        :data-testid="`theme-${option.value}`"
      >
        <input
          class="visually-hidden"
          type="radio"
          name="theme"
          :value="option.value"
          :checked="settings.theme === option.value"
          @change="settings.setTheme(option.value)"
        >
        <!-- A few strokes of schematic in the theme's own colours. -->
        <svg
          class="theme__sample"
          viewBox="0 0 120 40"
          aria-hidden="true"
        >
          <line
            x1="4"
            y1="28"
            x2="116"
            y2="28"
            class="theme__idle"
          />
          <polyline
            points="30,28 50,10 116,10"
            class="theme__set"
          />
          <rect
            x="66"
            y="20"
            width="26"
            height="14"
            rx="2"
            class="theme__tag"
          />
        </svg>
        <span class="theme__label">
          {{ option.label }}
          <span
            v-if="settings.theme === option.value"
            class="theme__chosen"
          >
            · In use
          </span>
        </span>
        <span class="theme__hint">{{ option.hint }}</span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.themes {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
}

.theme {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-4);

  color: var(--ink);
  background: var(--ground);
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  cursor: pointer;

  &:has(:focus-visible) {
    outline: var(--line) solid var(--focus);
    outline-offset: 2px;
  }
}

.theme--chosen {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.theme__chosen {
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: 600;
}

.theme__sample {
  width: 100%;
  aspect-ratio: 3 / 1;
  margin-bottom: var(--space-2);
  fill: none;
  stroke-width: 4;
}

.theme__idle {
  stroke: var(--track-idle);
}

.theme__set {
  stroke: var(--track-set);
}

.theme__tag {
  fill: var(--describer);
  stroke: none;
}

.theme__label {
  font-weight: 600;
}

.theme__hint {
  color: var(--ink-muted);
  font-size: var(--text-xs);
}
</style>
