<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';

import { useBackupStore } from '@/stores/backup';

const backup = useBackupStore();

const picker = useTemplateRef<HTMLInputElement>('picker');
const message = ref('');

function counted(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function exportFile(): void {
  const url = URL.createObjectURL(
    new Blob([backup.exportFile()], { type: 'application/json' }),
  );
  const link = document.createElement('a');

  link.href = url;
  link.download = `WebThrottle backup ${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  // Safari starts the download after this task, so the file must outlive it.
  setTimeout(() => URL.revokeObjectURL(url));
}

async function importFile(): Promise<void> {
  const input = picker.value;
  const file = input?.files?.[0];

  if (!input || !file) {
    return;
  }

  // Cleared, so choosing the same file again still brings it in.
  input.value = '';

  const result = backup.importFile(await file.text());

  message.value = result
    ? `Brought in ${counted(result.locos, 'loco')} and ${counted(result.maps, 'function map')}.`
    : `${file.name} is not a WebThrottle backup or a WebThrottle-EX AppData.json, so nothing has changed.`;
}

function clearSaved(): void {
  if (
    window.confirm(
      'Delete every saved loco and function map in this browser? You cannot undo this, so export them first if you might want them back.',
    )
  ) {
    backup.clearSaved();
    message.value = 'Your saved locos and function maps are deleted.';
  }
}
</script>

<template>
  <section
    class="settings-section"
    aria-labelledby="backup-title"
  >
    <h2
      id="backup-title"
      class="settings-section__title"
    >
      Backup
    </h2>
    <p class="settings-section__lead">
      Your saved locos and function maps are kept in this browser only. Export
      them to keep a copy or to move them to another computer. Import brings a
      copy back, and also reads the AppData.json that WebThrottle-EX's Export
      App data button saves, so your locos come over with you.
    </p>

    <div class="backup__keys">
      <button
        type="button"
        class="key"
        data-testid="export-data"
        @click="exportFile"
      >
        Export
      </button>
      <button
        type="button"
        class="key"
        data-testid="import-data"
        @click="picker?.click()"
      >
        Import
      </button>
      <input
        ref="picker"
        type="file"
        accept=".json,application/json"
        hidden
        data-testid="import-file"
        @change="importFile"
      >
      <button
        type="button"
        class="key backup__clear"
        data-testid="clear-data"
        @click="clearSaved"
      >
        Delete saved data
      </button>
    </div>

    <p
      class="backup__message"
      role="status"
      data-testid="backup-message"
    >
      {{ message }}
    </p>
  </section>
</template>

<style scoped>
.backup__keys {
  display: flex;
  flex-wrap: wrap;
  gap: var(--control-gap);
}

/* Set apart from the two keys that only copy data. */
.backup__clear {
  margin-left: auto;
}
</style>
