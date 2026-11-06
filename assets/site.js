// The page's own small moves: the clock, the five places, the bookshelf. The reader tools are separate.
document.documentElement.classList.add('js');
(function () {
  function clock() {
    var d = new Date();
    var f = function (o) { return new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'Europe/London' }, o)).format(d); };
    var line = 'It’s ' + f({ hour: '2-digit', minute: '2-digit', hour12: false }) + ' on a ' + f({ weekday: 'long' }) + ' in Northampton.';
    document.querySelectorAll('[data-clock]').forEach(function (el) { el.textContent = line; });
  }
  clock(); setInterval(clock, 20000);

  var reach = { home: 115, work: 160, community: 235, cyberspace: 300, fifth: 300 };
  function pickPlace(id, go) {
    document.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.place === id ? 'true' : 'false'); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('on', p.dataset.place === id); });
    document.querySelectorAll('.placedot,.placeword').forEach(function (n) { n.classList.toggle('on', id === 'fifth' || n.dataset.place === id); });
    var g = document.querySelector('.glow');
    if (g) g.style.transform = 'scale(' + (reach[id] / 350) + ')';
    if (go && !document.querySelector('.panel')) { var s = document.getElementById(id); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  document.querySelectorAll('[data-pick]').forEach(function (n) { n.addEventListener('click', function () { pickPlace(n.dataset.pick, true); }); });
  document.querySelectorAll('.tab').forEach(function (n) { n.addEventListener('click', function () { pickPlace(n.dataset.place, true); }); });
  if (document.querySelector('.tab')) pickPlace('fifth');

  function pickBook(n) {
    document.querySelectorAll('.spine').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.book === n ? 'true' : 'false'); });
    document.querySelectorAll('.bookpanel').forEach(function (p) { p.classList.toggle('on', p.dataset.book === n); });
  }
  document.querySelectorAll('.spine').forEach(function (b) { b.addEventListener('click', function () { pickBook(b.dataset.book); }); });
  if (document.querySelector('.spine')) pickBook('7');
})();

