// Service Worker for API Response Caching
// Reduces bandwidth by caching Supabase API responses

const CACHE_NAME = 'gestion-classe-api-v1';
const STATIC_CACHE = 'gestion-classe-static-v1';

// Cache durations in milliseconds
const CACHE_DURATION = {
    'Module': 3600000,        // 1h - rarely changes
    'Activite': 3600000,      // 1h - rarely changes
    'Branche': 3600000,       // 1h - rarely changes
    'SousBranche': 3600000,   // 1h - rarely changes
    'Eleve': 900000,          // 15min - semi-static
    'Classe': 900000,         // 15min - semi-static
    'Groupe': 900000,         // 15min - semi-static
    'Progression': 300000,    // 5min - dynamic
    'Attendance': 300000,     // 5min - dynamic
    'default': 600000         // 10min default
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json'
            ]);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - cache API responses
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only cache GET requests to Supabase
    if (event.request.method !== 'GET' || !url.hostname.includes('supabase.co')) {
        return;
    }

    event.respondWith(handleApiRequest(event.request, url));
});

async function handleApiRequest(request, url) {
    const cache = await caches.open(CACHE_NAME);

    // Try to get from cache first
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        const cachedTime = new Date(cachedResponse.headers.get('sw-cached-time'));
        const now = new Date();
        const age = now - cachedTime;

        // Determine cache duration based on table name
        const tableName = extractTableName(url.pathname);
        const maxAge = CACHE_DURATION[tableName] || CACHE_DURATION.default;

        // If cache is still fresh, return it
        if (age < maxAge) {
            // Fetch in background to update cache (stale-while-revalidate)
            fetchAndCache(request, cache);
            return cachedResponse;
        }
    }

    // Cache miss or expired - fetch from network
    try {
        const networkResponse = await fetch(request);

        // Only cache successful responses
        if (networkResponse.ok) {
            await cacheResponse(cache, request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Network error - return cached response if available
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

async function fetchAndCache(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            await cacheResponse(cache, request, response);
        }
    } catch (_error) {
        // Silently fail background updates
    }
}

async function cacheResponse(cache, request, response) {
    const headers = new Headers(response.headers);
    headers.set('sw-cached-time', new Date().toISOString());

    const cachedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
    });

    await cache.put(request, cachedResponse);
}

function extractTableName(pathname) {
    // Extract table name from Supabase REST API path
    // Example: /rest/v1/Eleve -> Eleve
    const match = pathname.match(/\/rest\/v1\/(\w+)/);
    return match ? match[1] : 'default';
}

// Message handler for cache control
self.addEventListener('message', (event) => {
    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
