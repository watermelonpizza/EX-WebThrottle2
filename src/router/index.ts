import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'console',
    component: () => import('@/views/ConsoleView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
  // Stage 3 routes folded into the single console; keep them pointing at home
  // so bookmarks and e2e navigation from older builds keep working.
  ...['throttles', 'locos', 'functions', 'communications'].map((path) => ({
    path: `/${path}`,
    redirect: '/',
  })),
];

// Hash history so the app runs on any static host (GitHub Pages, etc.).
export default createRouter({
  history: createWebHashHistory(),
  routes,
});
