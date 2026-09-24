import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const view = (name: string) => () => import(`@/views/${name}View.vue`);

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'console',
    component: view('Console'),
    meta: { title: 'Console' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: view('Settings'),
    meta: { title: 'Settings' },
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
