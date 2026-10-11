/* Pinned CDN SDK is loaded by index.html; recover with the retained local copy. */
(function () {
  'use strict';
  const TIMEOUT_MS = 15000;

  function localStyle() {
    const link = document.getElementById('vietflexStyle');
    if (!link) return Promise.reject(new Error('Missing Vietflex stylesheet.'));
    if (link.sheet) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Vietflex local stylesheet timed out.')), TIMEOUT_MS);
      function finish(error) {
        clearTimeout(timer);
        link.onload = null;
        link.onerror = null;
        if (error) reject(error); else resolve();
      }
      link.onload = () => finish();
      link.onerror = () => finish(new Error('Vietflex local stylesheet could not load.'));
      link.removeAttribute('integrity');
      link.removeAttribute('crossorigin');
      link.href = 'vendor/vietflex.css';
    });
  }

  function localSdk() {
    if (window.Vietflex?.vietflexMap && window.Vietflex?.ZoomControl) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('Vietflex local SDK timed out.')), TIMEOUT_MS);
      function finish(error) {
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (error) reject(error); else resolve();
      }
      script.src = 'vendor/vietflex.js';
      script.onload = () => finish(window.Vietflex?.vietflexMap && window.Vietflex?.ZoomControl
        ? null : new Error('Vietflex local SDK did not initialize.'));
      script.onerror = () => finish(new Error('Vietflex local SDK could not load.'));
      document.head.appendChild(script);
    });
  }

  window.ScamlandVietflexReady = Promise.all([localStyle(), localSdk()]);
})();
