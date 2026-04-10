// Service Worker — cache-first strategy for offline play.
// On first load the SW caches all game files + the Phaser CDN script.
// Subsequent loads (including offline) are served from the cache.

const CACHE = 'space-explorer-v1';

// Derive the base path so this works at root (/) or a sub-path (/space/).
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');

const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/src/styles/main.css',
  BASE + '/src/main.js',
  BASE + '/src/data/solarSystem.js',
  BASE + '/src/data/dialogues.js',
  BASE + '/src/entities/Star.js',
  BASE + '/src/entities/Moon.js',
  BASE + '/src/entities/Planet.js',
  BASE + '/src/entities/Spaceship.js',
  BASE + '/src/systems/OrbitalSystem.js',
  BASE + '/src/systems/NavigationSystem.js',
  BASE + '/src/systems/CameraSystem.js',
  BASE + '/src/systems/DialogueSystem.js',
  BASE + '/src/scenes/BootScene.js',
  BASE + '/src/scenes/MenuScene.js',
  BASE + '/src/scenes/SolarSystemScene.js',
  BASE + '/src/scenes/UIScene.js',
  BASE + '/src/scenes/DialogueScene.js',
  // Phaser 3 from CDN — cache so the game works offline after first visit
  'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Remove old cache versions
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request)),
  );
});
