import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

import { PRESETS } from '@/core/workspace';

const ROLES = PRESETS.map((preset) => preset.id).join('|');

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'console',
    component: () => import('@/views/ConsoleView.vue'),
  },
  // Each role preset has its own link, so a club can hand an operator the
  // page for their job (for example #/points).
  {
    path: `/:role(${ROLES})`,
    name: 'role',
    component: () => import('@/views/ConsoleView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
  // Older builds had a page per feature; send those bookmarks home.
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
