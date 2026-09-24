<script setup lang="ts">
import HeaderBar from '@/components/layout/HeaderBar.vue';
import StatusBar from '@/components/layout/StatusBar.vue';
</script>

<template>
  <div class="shell">
    <HeaderBar />
    <main class="shell__main">
      <router-view />
    </main>
    <StatusBar />
  </div>
</template>

<style lang="scss" scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.shell__main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
