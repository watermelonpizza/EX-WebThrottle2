import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const view = (name: string) => () => import(`@/views/${name}View.vue`);

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/throttles' },
  {
    path: '/throttles',
    name: 'throttles',
    component: view('Throttles'),
    meta: { title: 'Throttles', icon: 'mdi-speedometer', nav: true },
  },
  {
    path: '/locos',
    name: 'locos',
    component: view('Locos'),
    meta: { title: 'Locomotives', icon: 'mdi-train', nav: true },
  },
  {
    path: '/functions',
    name: 'functions',
    component: view('Functions'),
    meta: { title: 'Functions', icon: 'mdi-keyboard', nav: true },
  },
  {
    path: '/communications',
    name: 'communications',
    component: view('Communications'),
    meta: { title: 'Communications', icon: 'mdi-cable-data', nav: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: view('Settings'),
    meta: { title: 'Settings', icon: 'mdi-cog', nav: true },
  },
];

// Hash history so the app runs on any static host (GitHub Pages, etc.).
export default createRouter({
  history: createWebHashHistory(),
  routes,
});
