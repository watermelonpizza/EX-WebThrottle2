<script setup lang="ts">
import { ref, watch } from 'vue';

// Modal built on the native <dialog> element: showModal() gives focus
// trapping, ESC-to-close and page-inerting without any JS. The v-model is
// the open flag; closing (ESC, backdrop click, action buttons) syncs back.
const open = defineModel<boolean>();

const dialog = ref<HTMLDialogElement>();

watch(open, (value) => {
  const el = dialog.value;

  if (!el) return;
  if (value && !el.open) {
    // jsdom does not implement showModal(); the open attribute is enough
    // there and browsers get the full native modal behaviour.
    if (typeof el.showModal === 'function') el.showModal();
    else el.setAttribute('open', '');
  } else if (!value && el.open) {
    if (typeof el.close === 'function') el.close();
    else el.removeAttribute('open');
  }
});

function close(): void {
  open.value = false;
}
</script>

<template>
  <dialog ref="dialog" class="ui-dialog" @close="close">
    <slot />
    <div class="ui-dialog__actions">
      <slot name="actions" />
    </div>
  </dialog>
</template>

<style lang="scss" scoped>
.ui-dialog {
  width: min(40rem, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);

  padding: 1rem;
  overflow: auto;

  color: var(--color-ink);
  background: var(--color-panel);
  border: 2px solid var(--color-panel-edge);
  border-radius: var(--radius);
  box-shadow:
    inset 0 1px 0 var(--color-panel-raise),
    0 12px 40px rgb(0 0 0 / 0.5);
}

.ui-dialog::backdrop {
  background: rgb(0 0 0 / 0.55);
}

.ui-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--gap);
  margin-top: 1rem;
}
</style>
