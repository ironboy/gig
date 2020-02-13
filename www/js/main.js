// read query params
let params = {};
try {
  params = Object.fromEntries(location.href.split('#')[0].split('?')[1].split('&').map(x => x.split('=').map(x => decodeURIComponent(x))));
}
catch (e) { }

let hh1 = '', songs, titles, currentTitle, currentTitleStartTime;
let minutesPerSong = 3.3;
let store;
async function createStore() {
  // create a store using jsonflex
  // fallback localStorage
  let p = params.gig ? await JSON._load(params.gig).catch(() => { }) : '';
  let lstore;
  try {
    lstore = JSON.parse(localStorage[params.gig]);
  }
  catch (e) { }
  store = p;
  if (lstore) {
    if (!p || (lstore.lastUpdate && p.lastUpdate && lstore.lastUpdate > store.lastUpdate)) {
      store = lstore;
    }
  }
  if (!store) {
    if (params.create === '1') {
      let title = prompt(`Gig title for ${params.gig}?`);
      await JSON._save(params.gig, {
        title, played: [], playedTimes: [], times: []
      });
      store = await JSON._load(params.gig);
    }
    else {
      if (!params.gig) {
        gigChooser();
        return;
      }
      document.body.innerHTML = 'No such gig... Use params create=1';
    }
    return;
  }
  store.save = function () {
    this.lastUpdate = Date.now();
    JSON._save(params.gig, this);
    localStorage[params.gig] = JSON.stringify(this);
  }
  hh1 = store.title;
  document.title = hh1;
  store.save();
  !offLineSyncerStarted && setInterval(offLineSyncer, 5000);
  return true;
}

let offLineSyncerStarted = false;
async function offLineSyncer() {
  offLineSyncerStarted = true;
  let p = await JSON._load(params.gig).catch(() => { });
  if (!p) {
    createStore();
  }
}

async function start() {
  if (!(await createStore())) { return; }
  if (params.rehearse === '1') { document.body.className = 'rehearse' };
  let r = await fetch('/songs');
  songs = await r.json();
  titles = songs.map(x => {
    let isTF = x.split('\n')[0].includes('Frank') ? '%' : '';
    return x.split('(')[0].split('#').join('').trim() + isTF;
  });
  navigate();
  setInterval(clock, 1000);
}

async function gigChooser(rmode) {
  let r = await fetch('/gigs');
  let gigs = await r.json();
  document.body.innerHTML = `
    <h1>Välj ett gig:</h1>
    <div class="rehearse-mode">Rehearse mode: ${rmode ? 'on' : 'off'}</div><div class="gigs">
    ${gigs.map(x => `<p><a href="/?gig=${x.gig}${rmode ? '&rehearse=1' : ''}">${x.title}</a></p>`).join('')}
    </div>
  `;
}

function listTitles() {
  let unplayed = titles.filter(x => !(store.played.includes(x) || store.played.includes(x.split('%').join(''))));
  let all = [...unplayed, '<hr>', ...store.played];
  document.body.innerHTML = ('<h1 class="songs">' + hh1 + '<i class="icofont-reply-all reset img-in-h1"></i></h1> <div class="titles">' + all.map((x, ii) => `<p class="${store.played.includes(x) ? 'played' : ''}${x.includes('%') ? ' own' : ''} "><span>${x.split('%').join('')}</span>${store.played.includes(x) && !x.includes('SET') ? ' ' + tfLength(0, store.playedTimes[ii - unplayed.length - 1]).replace('00:', '') : ''}</p>`).join('') + '<hr>' + ([...new Set(all)].filter(x => !x.includes('SET')).length - 1) + ' låtar, varav ' + store.played.filter(x => !x.includes('SET')).length + ' spelade.<br>Ca ' + Math.round(unplayed.length * minutesPerSong) + ' minuter material kvar.</div><div class="time"></div>').split('<span>SET').join('<span><br>SET').split('<span><br>SET 1').join('<span>SET 1');
  currentTitle = '';
  currentTitleStartTime = '';
  clock();
}

function tf(ms, seconds = true) {
  return new Date(ms).toLocaleTimeString().slice(0, seconds ? undefined : -3);
}
function tfLength(start, stop) {
  let a = new Date('2020-01-01T00:00:00');
  a.setHours(0);
  a = a.getTime();
  a += stop - start;
  return tf(a);
}
function clock() {
  let div = document.querySelector('.time');
  if (!div) { return; }
  div.innerHTML = `
    <i class="icofont-sand-clock clock"></i>
    Nu: ${tf(Date.now(), false)}<br><br>
    ${store.times.map((x, i) => `
      <i>Set ${i + 1}</i><br>
      <span>Start:</span>${tf(x.start)}<br>
      ${x.stop ? `<span>Slut:</span>${tf(x.stop)}<br>` : ''}
      <span>Längd:</span>${tfLength(x.start, x.stop || Date.now())}<br>
      <br>
    `).join('')}
  `;
}
function startStopClock() {
  if (store.times.slice(-1)[0] && !store.times.slice(-1)[0].stop) {
    store.times.slice(-1)[0].stop = Date.now();
  }
  else {
    store.times.push({ start: Date.now() });
    store.played.push('SET ' + store.times.length);
    store.playedTimes.push(0);
    listTitles();
  }
  console.log(store)
  store.save();
  clock();
}

let lastPart = 0;
function listSong(title, part = 0) {
  title = title || currentTitle;
  currentTitle = title;
  part === 0 && (currentTitleStartTime = Date.now());
  let index = titles.indexOf(title);
  index = index >= 0 ? index : titles.indexOf(title + '%');
  let main;
  try {
    main = songs[index].split('\n');
  }
  catch (e) { listTitles(); return; }
  if (part === 'next') {
    let parts = songs[index].split('---').length;
    part = lastPart;
    part = parts > part + 1 ? part + 1 : 0;
  }
  lastPart = part;
  let h1 = main.shift().split('#').join('').split(')').join(')&nbsp;&nbsp;&nbsp;');
  main = main.join('\n').split('\n\n').join('</p><p>').split('\n').join('<br>\n');
  main = main.replace('<br>', '<p>') + '</p>';
  main = main.replace(/\*([^\*]*)\*/g, '<i>$1</i>');
  main = main.replace(/  /g, '&nbsp;&nbsp;&nbsp;');
  main = main.split('---')[part].trim();
  if (part > 0) { main = main.replace('<br>', ''); }
  document.body.innerHTML = '<h1 class="title">' + h1 + '<i class="icofont-home img-in-h1"></i></h1><div class="text">' + main + '</div><i class="icofont-check-circled played"></i>';
  sizeText();
}

function sizeText() {
  let text = document.querySelector('.text');
  let max = window.innerHeight - 100;
  let a = [{ c: 2, f: 22 }, { c: 3, f: 22 }, { c: 4, f: 22 }];
  for (let b of a) {
    text.style.fontSize = '22px';
    text.style.columnCount = b.c;
    while (text.offsetHeight > max && b.f > 10) {
      text.style.fontSize = b.f + 'px';
      b.f -= .5;
    }
  }
  if (a[1].f >= 18) {
    text.style.fontSize = a[1].f + 'px';
    text.style.columnCount = a[1].c;
    document.body.innerHTML += '';
    return;
  }
  a.sort((x, y) => x.f > y.f ? -1 : 1);
  text.style.fontSize = a[0].f + 'px';
  text.style.columnCount = a[0].c;
  document.body.innerHTML += '';
}

function navigate() {
  let hash = decodeURIComponent(location.hash.split('#').join('')).split('-').join(' ');
  if (!hash) { listTitles(); }
  else { listSong(hash); }
}

window.onhashchange = navigate;

document.addEventListener('click', e => {
  if (e.target.closest('.titles p')) {
    let title = e.target.closest('.titles p').querySelector('span').innerText.trim();
    location.hash = encodeURIComponent(title.split(' ').join('-'));
    return;
  }
  if (e.target.closest('h1.title .img-in-h1')) {
    location.hash = '';
    return;
  }
  if (e.target.closest('h1.songs .img-in-h1')) {
    store.played = [];
    store.playedTimes = [];
    store.times = [];
    store.save();
    listTitles();
    return;
  }
  if (e.target.closest('i.played')) {
    let pu = currentTitle;
    pu += titles.includes(pu) ? '' : '%';
    store.played.push(pu);
    store.playedTimes.push(Date.now() - currentTitleStartTime);
    //store.played = [...new Set(store.played)];
    store.save();
    location.hash = '';
    return;
  }
  if (e.target.closest('i.clock')) {
    startStopClock();
    return;
  }
  if (e.target.closest('.rehearse-mode')) {
    let el = e.target.closest('.rehearse-mode');
    gigChooser(el.innerHTML.includes('off'));
    return;
  }
  listSong('', 'next');
});

start();