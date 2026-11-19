// Configuración por invitación. Usa la ruta del QR oficial cuando la familia lo entregue.
const giftSettings = { enabled: inv.sections.gifts && (inv.gifts.length || inv.qr), yapeQr: inv.qr };
const ideas = inv.gifts;
let confirmedGift = '';
function giftMessage() {
  return giftSettings.enabled && confirmedGift ? '🎁 *Mi regalo:* '+confirmedGift+'.' : '';
}
if (giftSettings.enabled) {
  const panel = document.getElementById('gifts');
  const dialog = document.getElementById('giftDialog');
  const choices = document.getElementById('giftChoices');
  const confirmItem = document.getElementById('confirmItem');
  const browse = document.getElementById('browseGifts');
  const saveCash = document.getElementById('saveGift');
  const status = document.getElementById('giftStatus');
  const clear = document.getElementById('clearGift');
  const cash = document.getElementById('cashGift');
  const list = document.getElementById('giftList');
  panel.hidden = false;
  for (const [name,store] of ideas) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'registryItem';
    radio.value = name;
    const text = document.createElement('span');
    const shop = document.createElement('small');
    text.textContent = name;
    shop.textContent = store;
    text.append(shop);
    label.append(radio,text);
    choices.append(label);
  }
  if (giftSettings.yapeQr) {
    const qr = document.getElementById('yapeQr');
    qr.onload = () => {qr.hidden=false;document.getElementById('qrDemo').hidden=giftSettings.yapeQr !== 'yapedemo.webp';document.getElementById('qrPending').hidden=true;};
    qr.src = giftSettings.yapeQr;
  }
  const listMode = panel.querySelector('[value="list"]');
  const cashMode = panel.querySelector('[value="cash"]');
  function openList() {
    for (const radio of choices.querySelectorAll('input')) radio.checked = radio.value === confirmedGift;
    confirmItem.disabled = !choices.querySelector(':checked');
    dialog.showModal();
    choices.scrollTop = 0;
  }
  function showMode(cashSelected) {
    list.hidden = cashSelected;
    cash.hidden = !cashSelected;
    saveCash.hidden = !cashSelected;
    listMode.checked = !cashSelected;
    cashMode.checked = cashSelected;
  }
  function confirmGift(value) {
    confirmedGift = value;
    status.textContent = 'Se incluirá en tu confirmación: '+value+'.';
    clear.hidden = false;
  }
  listMode.parentElement.hidden = !ideas.length;
  cashMode.parentElement.hidden = !inv.qr;
  showMode(!ideas.length);
  browse.onclick = openList;
  listMode.onclick = () => {showMode(false);openList();};
  cashMode.onclick = () => showMode(true);
  document.getElementById('closeGifts').onclick = () => dialog.close();
  choices.onchange = () => {confirmItem.disabled = false;};
  confirmItem.onclick = () => {
    confirmGift(choices.querySelector(':checked').value);
    dialog.close();
  };
  const cashText = 'Aporte en efectivo por Yape';
  dialog.onclose = () => {
    showMode(!ideas.length || confirmedGift === cashText);
  };
  saveCash.onclick = () => confirmGift(cashText);
  clear.onclick = () => {
    confirmedGift = '';
    showMode(!ideas.length);
    status.textContent = 'Puedes confirmar tu asistencia sin elegir un regalo.';
    clear.hidden = true;
  };
}

