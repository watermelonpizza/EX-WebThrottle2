// Keeps a copy of the whole app, so WebThrottle opens with no internet in the
// train room: USB and the emulator never needed it. The build (vite.config.ts)
// fills in its file list and a version that changes with every release.
const FILES = self.__FILES__;
const CACHE = `webthrottle-${self.__VERSION__}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

// A new release takes over at once and drops the old copy. A tab still
// running the old release loads anything it has not yet opened from the
// site, as it would with no service worker at all.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.filter(key => key !== CACHE).map(key => caches.delete(key)),
        ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) {
    return;
  }

  // The page itself comes from the site while it can be reached, so a new
  // release shows on the next visit, and from the copy when it cannot.
  // ponytail: a network that hangs rather than fails delays the copy; add a
  // timeout if train rooms with half-working Wi-Fi turn up.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('index.html')));

    return;
  }

  // Everything else only changes with a release, which brings a new copy.
  // The copy holds one answer per file, so a server's Vary: Origin (sent
  // back for the page's crossorigin scripts) must not hide it.
  event.respondWith(
    caches
      .match(request, { ignoreVary: true })
      .then(copy => copy ?? fetch(request)),
  );
});
