<script setup lang="ts">
import RouteRow from '@/components/schematic/RouteRow.vue';
import { useRoutesStore } from '@/stores/routes';

const routes = useRoutesStore();
</script>

<template>
  <div class="list-panel">
    <div class="list-panel__head">
      <h2 class="list-panel__title">
        Routes
        <span class="list-panel__count numeric">{{
          routes.routes.length
        }}</span>
      </h2>
    </div>

    <p
      v-if="routes.routes.length === 0"
      class="list-panel__empty"
    >
      No routes reported by your Command Station. Routes are written in its
      EXRAIL script.
    </p>
    <ul
      v-else
      class="row-list list-panel__rows"
    >
      <li
        v-for="route in routes.routes"
        :key="route.id"
      >
        <RouteRow
          :route="route"
          kind="route"
          :paused="routes.paused"
          @start="routes.setRoute(route.id)"
        />
      </li>
    </ul>
  </div>
</template>
