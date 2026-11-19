const inv = JSON.parse(document.getElementById('invitation-data').textContent);
{
const select = selector => document.querySelector(selector);
const setText = (selector,value) => {select(selector).textContent=value};
document.title=inv.name+' · Mis quince años';
setText('h1',inv.name);
if(inv.templateId==='azul-acuarela'){
  const label=select('.cover .small');
  const number=document.createElement('b');
  number.textContent='15';
  label.replaceChildren('Mis ',number,' años');
  if(inv.album[0]){
    const photo=new Image();
    photo.alt='';
    photo.src=inv.album[0];
    select('.player img').src=photo.src;
    select('.paper').prepend(photo);
  }
}

for(const signature of document.querySelectorAll('.notepaper em,.farewell em')) signature.textContent='Con cariño, '+inv.name;
const date=new Date(inv.event+'-05:00');
function format(options){return new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',...options}).format(date)}
select('.event-date').lastChild.textContent=format({weekday:'long',day:'numeric',month:'long'});
select('#song').src=inv.song || 'vals.wav';
select('.notepaper blockquote').replaceChildren(...inv.letter.split(/\n+/).filter(Boolean).map(line=>{const p=document.createElement('p');p.textContent=line;return p}));
const family=select('.family').querySelectorAll('p');
family[1].textContent=inv.parents;
family[3].textContent=inv.sponsors;
const venue=select('.family + section');
venue.querySelector('p').textContent=format({dateStyle:'long',timeStyle:'short'});
venue.querySelector('strong').textContent=inv.venue;
venue.querySelector('strong').parentElement.lastChild.textContent=inv.address;
const mapsUrl=inv.maps?new URL(inv.maps):null;
const locationMatch=mapsUrl?.pathname.match(/!3d(-?[\d.]+)!4d(-?[\d.]+)/);
const fromLink=locationMatch ? locationMatch[1]+','+locationMatch[2] : mapsUrl?.searchParams.get('query') || mapsUrl?.searchParams.get('q');
const query=encodeURIComponent(fromLink||[inv.venue,inv.address].filter(Boolean).join(', '));
const map=venue.querySelector('iframe');
map.title='Mapa de '+inv.venue;
if(inv.sections.location) map.src=inv.embed || 'https://maps.google.com/maps?q='+query+'&output=embed';
venue.querySelector('a').href=inv.maps || 'https://www.google.com/maps/search/?api=1&query='+query;
setText('.attire h2',inv.dress);
document.querySelectorAll('.looks figure').forEach((figure,i)=>{
  const caption=i?inv.man:inv.woman;
  const img=figure.querySelector('img'); img.alt=caption;
  if(inv.looks[i]) img.src=inv.looks[i];
  figure.querySelector('figcaption').textContent=caption;
});
select('.crowned').firstChild.textContent=inv.name;
select('.crowned').parentElement.firstChild.textContent='El '+inv.color+' está reservado para ';
select('#book').setAttribute('aria-label','Álbum de '+inv.name);
select('#gifts .small').textContent='Un detalle para '+inv.name;
select('#yapeQr').alt='Código QR de Yape';
const parts={cover:'.cover',intro:'.event-date',music:'.player',count:'.count-card',letter:'.words',family:'.family',location:'.family + section',attire:'.attire',album:'.album',rsvp:'.rsvp',farewell:'.farewell'};
for(const [key,selector] of Object.entries(parts)) select(selector).hidden=!inv.sections[key];
family[0].hidden=family[1].hidden=!inv.parents || !inv.sections.parents;
family[2].hidden=family[3].hidden=!inv.sponsors || !inv.sections.sponsors;
select('.intro').hidden=!(inv.sections.intro||inv.sections.music||inv.sections.count);
select('.album').hidden=!inv.sections.album||!inv.album.length;
select('.pages').hidden=inv.album.length<=2;
if(!inv.sections.cover)select('#letter').hidden=false;
}




