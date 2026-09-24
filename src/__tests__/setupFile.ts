class ResizeObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}

window.ResizeObserver = window.ResizeObserver || ResizeObserverStub;

// jsdom elements lack these scroll/geometry methods the shell leans on.
Element.prototype.scrollTo = Element.prototype.scrollTo || (() => {});

// Only .matches is read (the settings store's dark-mode default).
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches: false }),
  });
}
