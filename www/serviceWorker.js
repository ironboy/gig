class ServiceWorker {

  // This service worker has a
  // cache strategy: cache first
  // except for resources where you 
  // mark another strategy, these can be
  // network first or network only

  // When you change version below
  // you invalide the cache
  // (this happens immediately
  // not on next page load)

  // ironboy 2019

  constructor() {
    this.debug = false;
    this.version = 2.0;
    this.myRoute = 'serviceWorker.js';
    this.lastRequestTime = 0;
    this.log('running from scratch...');
    this.addEventListeners();
  }

  log(...args) {
    // add a slight delay to logs
    // otherwise the first one doesn't show (Chrome)
    this.debug && setTimeout(() => console.log.apply(
      console, ['ServiceWorker:', ...args]
    ), 500);
  }

  addEventListeners() {
    // Self is a reference to the service worker
    let add = (event, func) => self.addEventListener(event, func);
    // Important events are install, activate and fetch.
    // The event object they receive has methods (waitUntil, respondWith)
    // that you call with a promise/async function that needs to resolve 
    // before the event is considered "done" 
    add('install', e => e.waitUntil(this.install(e)));
    add('activate', e => e.waitUntil(this.activate(e)));
    add('fetch', e => {
      let method = e.request.method;
      let url = e.request.url.split('#')[0];
      // Let url:s with network only strategy
      // bypass the service worker completely
      if (this.networkOnly(method, url)) {
        this.log('network only strategy for', method, url);
        return false;
      }
      // Handle cache first and network first
      // strategies with the e.respondWith method
      else {
        return e.respondWith(this.fetch(e));
      }
    });
    this.log('added event listeners');
  }

  async install() {
    // We call self.skipWaiting - which immediately
    // makes this version of the service worker call activate
    // (we could precache certain files here but we don't)
    await self.skipWaiting();
    this.log(`version ${this.version} installed.`);
  }

  async activate() {
    // We call self.clients.claim that sets this version of the 
    // service worker as the active "controller" for all all clients
    // where the site has been visited - removing old versions
    await self.clients.claim();
    this.log(`version ${this.version} activated.`);
  }

  async deleteOldCaches() {
    // Get the keys (corresponding to versions) of all caches
    // and delete all caches expect the one for this version
    for (let key of await caches.keys()) {
      if (key / 1 === this.version) { continue; }
      await caches.delete(key);
      this.log(`deleted old [cache ${key}]`);
    }
  }

  async fetch(e) {
    // Check version
    await this.getVersion();
    // Open or crete the correct cache
    let cache = await caches.open(this.version);
    // Clear old caches
    await this.deleteOldCaches();
    // The request (url etc.) from the fetch event object:
    let req = e.request;
    let url = req.url.split('#')[0];
    let method = req.method;
    let res;
    // Check for network first strategy
    let networkFirst = this.networkFirst(method, url);
    networkFirst && this.log('network first strategy for', method, url);
    if (!networkFirst) {
      // Look up the response in cache
      res = await cache.match(url);
      if (res) {
        // Serve from cache if we have it
        this.log(`served response from [cache ${this.version}]`, url);
        return res;
      }
    }
    // Otherwise fetch the response from our server
    let error;
    res = await fetch(req).catch(e => error = e);
    if (error) {
      this.log('could not get a response... offline?', url);
      if (networkFirst) {
        // is networkFirst, but network failed so now try the cache
        res = await cache.match(url);
        res && this.log('served stale from cache', url);
        if (res) { return res; }
      }
      this.log('served an response error', method, url);
      return Response.error(404);
    }
    // Open our current cache / or create it
    // put a copy of the response in the cache
    await cache.put(req, res.clone());
    this.log(`cached response in [cache ${this.version}]`, url);
    // Return the response
    this.log('served from server', url);
    return res;
  }

  // Advanced:
  // Since the constructor only runs on new installation + activation
  // and fetch runs before that a 'from cache first' cache strategy
  // usually lags behind current content with one page load
  // BUT: by checking the version from the fetch method (see above)
  // we can get around this and serve the current content directly
  // after a version change.
  async getVersion() {
    // Only check the version if at least 3 seconds since last request
    let requestTime = Date.now();
    if (requestTime - this.lastRequestTime < 3000) {
      return;
    }
    // Check the version by loading this file as text
    // and extracting the version number using a reg exp
    this.lastRequestTime = requestTime;
    let error, response = await fetch(this.myRoute)
      .catch(e => error = e);
    if (error) {
      // We couldn't load the file - probably offline
      this.log('could not get version, offline?', error);
      this.log('using latest known version', this.version);
      return;
    }
    // Set the version
    let text = await response.text();
    this.version = text.match(/this.version\s*=\s*([\d|\.]*)/)[1] / 1;
    this.log(`checked the site version: ${this.version}`);
  }

  networkFirst(method, url) {
    // network first everything
    return true;
  }

  networkOnly(method, url) {
    let route = url.replace(location.origin, '');
    // network only json
    if (route.indexOf('/json/') === 0) { return true; }
    if (method !== 'GET') { return true; }
  }

}

new ServiceWorker();