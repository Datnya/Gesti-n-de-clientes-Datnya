const byId = id => document.getElementById(id);
byId('open').addEventListener('click', async () => {
  const cover = document.querySelector('.cover');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  cover.classList.add('opened');
  if (!reduced) {
    const paper = cover.querySelector('.paper');
    await Promise.allSettled(paper.getAnimations().map(animation => animation.finished));
  }
  byId('letter').hidden = false;
  const heading = byId('heading');
  if (heading.getClientRects().length) heading.focus({preventScroll:true});
  else { byId('letter').tabIndex = -1; byId('letter').focus({preventScroll:true}); }
  byId('letter').scrollIntoView({behavior:reduced ? 'instant' : 'smooth'});
},{once:true});
const song = byId('song');
const music = byId('music');
function syncPlayer() {
  music.setAttribute('aria-pressed', String(!song.paused));
  music.setAttribute('aria-label', song.paused ? 'Reproducir mi canción' : 'Pausar mi canción');
}
song.addEventListener('play',syncPlayer);
song.addEventListener('pause',syncPlayer);
music.onclick = async () => {
  byId('audioStatus').textContent = '';
  try {
    if (song.paused) await song.play();
    else song.pause();
  } catch { byId('audioStatus').textContent = 'Toca reproducir para volver a intentarlo.'; }
};
const eventTime = Date.parse(inv.event+'-05:00');
const digits = byId('count').querySelectorAll('b');
function countdown() {
  const remaining = Math.ceil((eventTime-Date.now())/1000);
  if (remaining <= 0) { byId('count').textContent = '¡Llegó el gran día!'; return; }
  const values = [Math.floor(remaining/86400), Math.floor(remaining/3600)%24, Math.floor(remaining/60)%60, remaining%60];
  digits.forEach((digit,i) => {
    const next = String(values[i]).padStart(2,'0');
    if (digit.textContent !== next) digit.textContent = next;
  });
  setTimeout(countdown,1000-Date.now()%1000);
}
countdown();
const flowers = byId('flowers');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let visible = false;
function syncFlowers() {
  if (visible && !document.hidden && !motion.matches) flowers.play().catch(() => {});
  else flowers.pause();
}
new IntersectionObserver(([entry]) => {visible=entry.isIntersecting;syncFlowers();}).observe(flowers);
motion.addEventListener('change',syncFlowers);
document.addEventListener('visibilitychange',syncFlowers);
byId('close').onclick = () => byId('viewer').close();
const total = byId('total');
const others = byId('others');
if(total) total.onchange = event => {
  const count = Number(event.target.value);
  while (others.children.length >= count) others.lastChild.remove();
  while (others.children.length < count-1) {
    const label = document.createElement('label');
    label.textContent = 'Nombre del acompañante '+(others.children.length+1);
    const input = document.createElement('input');
    input.required = true;
    input.maxLength = 80;
    label.append(input);
    others.append(label);
  }
};
document.querySelector('form').onsubmit = e => {
  e.preventDefault();
  const fields = [byId('guest'), ...others.querySelectorAll('input')];
  for (const field of fields) {
    if (!field.value.trim()) {
      field.value = '';
      field.reportValidity();
      return;
    }
  }
  const names = fields.map(field => field.value.trim());
  const message = inv.templateId==="hello-kitty" ? `¡Hola! Confirmo que ${names[0]} asistirá al cumpleaños de ${inv.name}. ¡Gracias por la invitación!` : [
    `¡Hola! Soy ${names[0]} y confirmo mi asistencia a los XV de ${inv.name}.`,
    `*Total de asistentes:* ${names.length}.\n*Asistentes:* ${names.join(', ')}.`,
    giftMessage(),
    '¡Gracias por invitarnos!'
  ].filter(Boolean).join('\n\n');
  window.open('https://wa.me/'+inv.phone.replace(/\D/g,'')+'?text='+encodeURIComponent(message),'_blank','noopener');
};

const spreads = inv.album.reduce((pages,src,i) => { if(i%2===0) pages.push([]); pages[pages.length-1].push(src); return pages; }, []);
const book = byId('book');
let page = 0;
function turnPage(index) {

  const previous = page;
  page = (index + spreads.length) % spreads.length;
  const files = spreads[page];
  const leaf = document.createElement('article');
  leaf.className = 'leaf';
  for (const file of files) {
    const button = document.createElement('button');
    const image = new Image();
    image.src = file;
    image.alt = 'Fotografía de quinceañera, página '+(page+1)+', imagen '+(files.indexOf(file)+1);
    button.setAttribute('aria-label','Ampliar: '+image.alt);
    button.append(image);
    button.onclick = () => {
      const enlarged = byId('viewer').querySelector('img');
      enlarged.src = image.src;
      enlarged.alt = image.alt;
      byId('viewer').showModal();
    };
    leaf.append(button);
  }
  const old = book.lastElementChild;
  book.replaceChildren(leaf);
  if (old && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    old.inert = true;
    book.prepend(old);
    const angle = index > previous ? -90 : 90;
    old.style.transformOrigin = index > previous ? 'left' : 'right';
    old.style.zIndex = 2;
    old.animate([{transform:'rotateY(0)'},{transform:'rotateY('+angle+'deg)',opacity:.35}],{duration:480,easing:'ease-in-out'}).onfinish = () => old.remove();
  }
  byId('folio').textContent = (page+1)+' de '+spreads.length;


}
byId('prev').onclick = () => turnPage(page-1);
byId('next').onclick = () => turnPage(page+1);
let touch;
book.addEventListener('touchstart',e => {touch=e.touches[0];},{passive:true});
book.addEventListener('touchend',e => {
  if (!touch) return;
  const dx=e.changedTouches[0].clientX-touch.clientX;
  const dy=e.changedTouches[0].clientY-touch.clientY;
  if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)) turnPage(page+(dx<0?1:-1));
  touch=null;
},{passive:true});
if (spreads.length) turnPage(0);
const venue = document.querySelector('.family + section');
const card = document.createElement('div');
card.className = 'event-card';
card.append(...venue.childNodes);
venue.append(card);
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('waiting');
      observer.unobserve(entry.target);
    }
  },{threshold:0.08});
  for (const item of document.querySelectorAll('.intro h2,.attire h2,blockquote,.family p,.looks figure,#book,.rsvp form')) {
    item.classList.add('reveal-ready','waiting');
    observer.observe(item);
  }
}











