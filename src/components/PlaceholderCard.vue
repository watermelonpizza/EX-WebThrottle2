<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <v-container class="fill-height">
    <v-row class="fill-height" align="center" justify="center">
      <v-col cols="12" md="8" lg="6" class="text-center">
        <v-icon :icon="icon" size="72" class="mb-6 text-primary" />
        <h1 class="text-h3 mb-2" data-test="page-title">
          {{ title }}
        </h1>
        <p
          class="text-subtitle-1 text-medium-emphasis mx-auto"
          style="max-width: 36rem"
        >
          {{ description }}
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>
