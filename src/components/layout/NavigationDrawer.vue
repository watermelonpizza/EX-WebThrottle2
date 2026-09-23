<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const router = useRouter();
const model = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const navItems = computed(() =>
  router.options.routes
    .filter((route) => route.meta?.nav)
    .map((route) => ({
      path: route.path,
      title: route.meta?.title ?? '',
      icon: route.meta?.icon ?? 'mdi-circle-outline',
    })),
);
</script>

<template>
  <v-navigation-drawer v-model="model" floating data-test="navigation-drawer">
    <v-list nav density="comfortable">
      <v-list-item
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :prepend-icon="item.icon"
        :data-test="`nav-${item.path.slice(1)}`"
      >
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>
