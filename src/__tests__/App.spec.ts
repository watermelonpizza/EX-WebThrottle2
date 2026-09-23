import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createVuetify } from 'vuetify';
import { describe, expect, it } from 'vitest';

import App from '@/App.vue';
import { routes } from '@/router';

function mountApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });
  const wrapper = mount(App, {
    global: {
      plugins: [createPinia(), router, createVuetify()],
    },
  });
  return { wrapper, router };
}

describe('App shell', () => {
  it('renders a navigation item for every route', async () => {
    const { wrapper, router } = mountApp();
    await router.push('/throttles');
    await router.isReady();
    await flushPromises();

    const titles = wrapper
      .findAll('.v-list-item-title')
      .map((item) => item.text());
    expect(titles).toEqual(
      expect.arrayContaining([
        'Throttles',
        'Locomotives',
        'Functions',
        'Communications',
        'Settings',
      ]),
    );
    expect(wrapper.find('[data-test="navigation-drawer"]').exists()).toBe(true);
  });

  it('shows the title of the active route', async () => {
    const { wrapper, router } = mountApp();
    await router.push('/communications');
    await router.isReady();
    await flushPromises();

    expect(wrapper.get('[data-test="page-title"]').text()).toBe(
      'Communications',
    );
  });
});
