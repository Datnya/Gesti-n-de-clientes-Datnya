const princessScenes = document.querySelectorAll('.words,.farewell');
if ('IntersectionObserver' in window) {
  const sceneObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('portrait-visible');
        sceneObserver.unobserve(entry.target);
      }
    }
  }, {threshold:0.1});
  princessScenes.forEach(scene => sceneObserver.observe(scene));
}

const root = document.documentElement;
document.fonts.load('700 40px Cormorant').then(faces => {
  if (!faces.length) root.classList.add('font-unavailable');
}).catch(() => root.classList.add('font-unavailable')).finally(() => root.classList.add('type-ready'));

const calendar = document.querySelector('.event-date i');
if (calendar) {
  const day = calendar.parentElement.textContent.match(/\b\d{1,2}\b/);
  calendar.textContent = day ? day[0] : '';
}

const dateCard = document.querySelector('.intro .event-date');
const playerCard = document.querySelector('.intro .player');
if (dateCard && playerCard) playerCard.after(dateCard);

const envelope = document.querySelector('.cover .envelope');
const cover = envelope.closest('.cover');
const flightLayer = document.createElement('div');
flightLayer.className = 'butterfly-flight-layer';
flightLayer.setAttribute('aria-hidden','true');
cover.append(flightLayer);
function alignFlightLayer() {
  const box = envelope.getBoundingClientRect();
  const bounds = cover.getBoundingClientRect();
  Object.assign(flightLayer.style, {
    left:(box.left-bounds.left)+'px',top:(box.top-bounds.top)+'px',
    width:box.width+'px',height:box.height+'px'
  });
}
for (let i=0; i<2; i++) {
  const butterfly = document.createElement('span');
  butterfly.className = 'flying-butterfly';
  flightLayer.append(butterfly);
}
document.querySelector('#open').addEventListener('click',() => requestAnimationFrame(alignFlightLayer),{once:true});
new ResizeObserver(alignFlightLayer).observe(cover);

