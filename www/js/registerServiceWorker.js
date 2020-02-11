class RegisterServiceWorker {

  constructor() {
    this.debug = false;
    this.routeToServiceWorker = '/serviceWorker.js';
    // check browser support, if support call register
    'serviceWorker' in navigator && this.register();
  }

  log(...args) {
    this.debug && console.log.apply(
      console, ['RegisterServiceWorker:', ...args]
    );
  }

  async register() {
    // check if there are any registrered service workers
    let registrations = await navigator.serviceWorker.getRegistrations();
    // wait for the service worker to register
    // or return an error
    let error, registered = await navigator.serviceWorker
      .register(this.routeToServiceWorker)
      .catch(e => error = e);
    this.log(error ? error : `scope: ${registered.scope}`);
    // you could reload to save one "cycle" of uncached content
    // if this is the first time the service worker registrers
    registrations.length === 0 && location.reload();
  }

}

new RegisterServiceWorker();