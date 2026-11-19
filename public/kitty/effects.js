const stickerScenes=[
  ['.frame','saludo'],['.notepaper','pastel'],
  ['.gift-card','regalo'],['.farewell','saludo']
];
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
function animateArt(img,art){
  const sync=()=>{img.src='/kitty/'+art+(motionPreference.matches?'.png':'.gif')};
  sync();motionPreference.addEventListener('change',sync);
}
for(const [selector,art] of stickerScenes){
  const sticker=new Image();
  sticker.className='kitty-sticker';
  sticker.alt='';
  animateArt(sticker,art);
  document.querySelector(selector).prepend(sticker);
}
animateArt(document.querySelector('.player img'),'pastel');
document.querySelector('.player').after(document.querySelector('.event-date'));
document.querySelector('.words video').removeAttribute('poster');


const envelope=document.querySelector('.envelope');
document.getElementById('open').addEventListener('click',()=>{
  for(const art of ['flor','cupcake','cupcake','flor']){
    const charm=new Image();
    charm.className='party-charm';
    charm.src='/kitty/'+art+'.svg';
    charm.alt='';
    envelope.append(charm);
  }
},{once:true});
