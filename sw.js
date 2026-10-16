'use strict';
const CACHE_NAME = 'gto-pocket-shell-v9';
const SHELL = ['index.html', 'styles.css', 'fonts/NotoSansKR-VF.ttf', 'app.js', 'history.js', 'multiway.js', 'solver.html', 'solver.js', 'data/manifest.json', 'data/40bb/manifest.json', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const base = new URL('./', self.registration.scope);
    await cache.addAll(SHELL.map((path) => new URL(path, base).href));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('gto-pocket-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const shell = await caches.open(CACHE_NAME);
    const cached = await shell.match(request) || await caches.match(request);
    if (cached) return cached;
    try {
      const network = await fetch(request);
      if (network.ok && request.destination !== 'document') {
        const nodeData = /\/data\/(?:40bb\/)?-?\d+\.json$/.test(url.pathname);
        const cache = await caches.open(nodeData ? 'gto-pocket-local-strategies-v1' : CACHE_NAME);
        cache.put(request, network.clone());
      }
      return network;
    } catch (error) {
      if (request.mode === 'navigate') {
        const fallback = await caches.match(new URL('index.html', new URL('./', self.registration.scope)).href);
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
