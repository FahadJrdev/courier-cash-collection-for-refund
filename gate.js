/*
 * Access gate. The page ships no courier data at all — data.enc is AES-256-GCM ciphertext, and the
 * key that decrypts it never leaves the person holding the link. Without the key the payload is
 * unreadable even to someone who downloads it directly.
 *
 * Give the key in the query string:   ?k=XXXXX-XXXXX-XXXXX-XXXXX
 * or in the fragment, which browsers do not send to the server:   #k=XXXXX-XXXXX-XXXXX-XXXXX
 *
 * Once accepted the key is held in sessionStorage for the tab and wiped from the visible URL, so
 * it is not left sitting in the address bar to be screenshotted or pasted on.
 */
(function () {
  'use strict';

  var ITERATIONS = 250000;
  var SALT_BYTES = 16;
  var IV_BYTES = 12;
  var STORE = 'cc.k';

  var app = document.getElementById('app');

  function screen(title, body, showForm) {
    app.innerHTML =
      '<div class="gate">' +
        '<h1>' + title + '</h1>' +
        '<p>' + body + '</p>' +
        (showForm
          ? '<form id="gate-form" autocomplete="off">' +
              '<label for="gate-key">Access key</label>' +
              '<input id="gate-key" name="k" type="password" inputmode="text" spellcheck="false" ' +
                'autocomplete="off" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" required>' +
              '<button type="submit">Open</button>' +
            '</form>'
          : '') +
      '</div>';
    if (showForm) {
      document.getElementById('gate-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var v = document.getElementById('gate-key').value.trim();
        if (v) { attempt(v, true); }
      });
      document.getElementById('gate-key').focus();
    }
  }

  function readKeyFromUrl() {
    var q = new URLSearchParams(location.search).get('k');
    if (q) { return q.trim(); }
    var m = location.hash.match(/(?:^#|[#&])k=([^&/]+)/);
    return m ? decodeURIComponent(m[1]).trim() : null;
  }

  function scrubUrl() {
    var hash = location.hash.replace(/(?:^#|[#&])k=[^&/]*/, '');
    if (hash === '#') { hash = ''; }
    try {
      history.replaceState(null, '', location.pathname + (hash || ''));
    } catch (err) { /* older browser: leave the URL alone */ }
  }

  function bytes(b64) {
    var raw = atob(b64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) { out[i] = raw.charCodeAt(i); }
    return out;
  }

  function decrypt(payload, key) {
    var all = bytes(payload);
    var salt = all.slice(0, SALT_BYTES);
    var iv = all.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
    var body = all.slice(SALT_BYTES + IV_BYTES);
    var enc = new TextEncoder();

    return crypto.subtle
      .importKey('raw', enc.encode(key), 'PBKDF2', false, ['deriveKey'])
      .then(function (material) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
          material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
        );
      })
      .then(function (aes) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, aes, body);
      })
      .then(function (buf) {
        return JSON.parse(new TextDecoder().decode(buf));
      });
  }

  function attempt(key, fromForm) {
    screen('Unlocking…', 'Checking the access key.', false);

    fetch('data.enc', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) { throw new Error('payload ' + r.status); }
        return r.text();
      })
      .then(function (payload) { return decrypt(payload.trim(), key); })
      .then(function (data) {
        try { sessionStorage.setItem(STORE, key); } catch (err) { /* private mode */ }
        scrubUrl();
        window.CASE_DATA = data;
        var s = document.createElement('script');
        s.src = 'app.js';
        document.body.appendChild(s);
      })
      .catch(function () {
        try { sessionStorage.removeItem(STORE); } catch (err) { /* ignore */ }
        screen(
          'Not available',
          fromForm
            ? 'That key does not open this page. Check it and try again.'
            : 'This page needs an access key. Enter it below, or open the link you were given in full.',
          true
        );
      });
  }

  if (!window.crypto || !crypto.subtle) {
    screen('Not available',
      'This page needs a secure connection to open. Use the <strong>https://</strong> address, not http.', false);
    return;
  }

  var stored = null;
  try { stored = sessionStorage.getItem(STORE); } catch (err) { /* ignore */ }
  var key = readKeyFromUrl() || stored;

  if (key) {
    attempt(key, false);
  } else {
    screen('Courier cash — refunded orders',
      'This page needs an access key. Enter it below, or open the link you were given in full.', true);
  }
})();
