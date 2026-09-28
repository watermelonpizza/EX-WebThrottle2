import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import {
  RouteState,
  RouteType,
  pauseTasks,
  requestRoute,
  requestRouteList,
  resumeTasks,
  startAutomation,
  startRoute,
} from '@/core/protocol';

import { useConnectionStore } from '@/stores/connection';
import { useLocosStore } from '@/stores/locos';

// A route or automation as a panel shows it.
export interface RouteEntry {
  id: number;
  // EXRAIL's caption for the button when it has set one, else its
  // description, else its number.
  name: string;
  // EXRAIL says to show it as set or running.
  active: boolean;
  // EXRAIL says it cannot be started just now.
  disabled: boolean;
}

interface ListedRoute {
  id: number;
  // Unknown until the station describes it; until then it is not shown.
  type?: RouteType;
  description: string;
  caption?: string;
  state: RouteState;
}

// The routes and automations in the Command Station's EXRAIL script. They are
// listed on connect like the rest of the inventory, and EXRAIL broadcasts
// their button states and captions to every Throttle as they change.
export const useRoutesStore = defineStore('routes', () => {
  const connection = useConnectionStore();
  const locos = useLocosStore();

  const listed = ref<ListedRoute[]>([]);

  // Whether this Throttle has paused every EXRAIL task (STOP ALL does). EXRAIL
  // never reports its pause, so this is only ever what was sent from here.
  // ponytail: another Throttle resuming, or a reload, goes unseen. Resume is
  // still only offered after a pause sent from here: resuming tasks that were
  // never paused sets their locos to whatever speed EXRAIL happens to hold.
  const paused = ref(false);

  function listedRoute(id: number): ListedRoute {
    const existing = listed.value.find(route => route.id === id);

    if (existing) {
      return existing;
    }

    const added: ListedRoute = {
      id,
      description: '',
      state: RouteState.INACTIVE,
    };

    listed.value.push(added);
    listed.value.sort((first, second) => first.id - second.id);

    return added;
  }

  function entries(type: RouteType, noun: string): RouteEntry[] {
    return listed.value
      .filter(route => route.type === type && route.state !== RouteState.HIDDEN)
      .map(route => ({
        id: route.id,
        name: route.caption || route.description || `${noun} ${route.id}`,
        active: route.state === RouteState.ACTIVE,
        disabled: route.state === RouteState.DISABLED,
      }));
  }

  const routes = computed(() => entries(RouteType.ROUTE, 'Route'));
  const automations = computed(() =>
    entries(RouteType.AUTOMATION, 'Automation'));

  connection.onMessage((message) => {
    if (message.kind === 'route-list') {
      // The list is everything EXRAIL has, so anything missing from it is
      // gone. Each listed id is then asked what it is.
      listed.value = listed.value.filter(route =>
        message.ids.includes(route.id));

      for (const id of message.ids) {
        listedRoute(id);
        connection.send(requestRoute(id));
      }

      return;
    }

    if (message.kind === 'route-detail') {
      const route = listedRoute(message.id);

      route.type = message.type;
      route.description = message.label;

      return;
    }

    if (message.kind === 'route-state') {
      listedRoute(message.id).state = message.state;

      return;
    }

    if (message.kind === 'route-caption') {
      listedRoute(message.id).caption = message.caption;
    }
  });

  watch(
    () => connection.status,
    (status) => {
      if (status === 'connected') {
        connection.send(requestRouteList());

        return;
      }

      if (status === 'disconnected') {
        listed.value = [];
        paused.value = false;
      }
    },
  );

  // The panels can be opened long after connecting, so ask the station
  // straight away when it is already there.
  if (connection.status === 'connected') {
    connection.send(requestRouteList());
  }

  // An automation drives a loco from one of this Throttle's desks, so whoever
  // starts it always has that loco's Stop key in front of them. It is the
  // first desk's loco unless another one is picked.
  const pickedLoco = ref<number>();

  const automationLoco = computed(() =>
    locos.throttles.find(throttle => throttle.address === pickedLoco.value)
    ?? locos.throttles[0]);

  function pickLoco(address: number): void {
    pickedLoco.value = address;
  }

  // Both only send: EXRAIL runs the script, and the turnout, loco and route
  // state broadcasts it causes are what change the screen.
  function setRoute(id: number): void {
    connection.send(startRoute(id));
  }

  function startWithLoco(id: number): void {
    if (automationLoco.value === undefined) {
      return;
    }

    connection.send(startAutomation(id, automationLoco.value.address));
  }

  function pauseAll(): void {
    connection.send(pauseTasks());
    paused.value = true;
  }

  // STOP ALL: EXRAIL is paused first, so no automation sets a train going
  // again and EXRAIL notes the speeds to resume with; then every loco stops.
  function stopAll(): void {
    pauseAll();
    locos.stopAll();
  }

  // EXRAIL puts each task's loco back to the speed it had when paused, so
  // trains that were running under an automation set off again.
  function resumeAll(): void {
    connection.send(resumeTasks());
    paused.value = false;
  }

  return {
    routes,
    automations,
    automationLoco,
    paused,
    pickLoco,
    setRoute,
    startWithLoco,
    pauseAll,
    stopAll,
    resumeAll,
  };
});
