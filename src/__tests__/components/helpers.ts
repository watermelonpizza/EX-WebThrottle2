import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';

import { MockTransport } from '@/core/transport';
import { routes } from '@/router';
import { useConnectionStore } from '@/stores/connection';
import { useEventsStore } from '@/stores/events';
import { useInventoryStore } from '@/stores/inventory';
import { useLocosStore } from '@/stores/locos';
import { usePowerStore } from '@/stores/power';

// A fresh store set, a router on the given path, and a station that is
// already connected; tests script what the station says next.
export async function connectedApp(path = '/') {
  const pinia = createPinia();

  setActivePinia(pinia);

  const router = createRouter({ history: createMemoryHistory(), routes });

  await router.push(path);

  const station = new MockTransport();

  // The stores that follow broadcasts start listening when first used, as
  // the app's panels do; create them before the station starts talking.
  useInventoryStore();
  useLocosStore();
  usePowerStore();
  useEventsStore();

  await useConnectionStore().connect(station);
  await flushPromises();

  return { pinia, router, station };
}

export type ConnectedApp = Awaited<ReturnType<typeof connectedApp>>;

// The emulator introduces itself as a HOST board, which brings in the sample
// layout diagram drawn for its demo layout.
export const EMULATOR_BANNER = '<iDCC-EX V-5.6.6 / HOST / HOST_SHIELD G-test>';
