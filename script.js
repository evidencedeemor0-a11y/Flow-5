(function(){
'use strict';

const CURRENCY_SYMBOLS = { USD:'$', GBP:'£', EUR:'€', NGN:'₦' };
const DEFAULT_STATE = {
  passcode: '1472',
  checkingBalance: 2450.75,
  savingsBalance: 500.00,
  name: 'Flow Member',
  handle: '@flow-member',
  theme: 'dark',
  accent: 'navy',
  currency: 'USD',
  notifsEnabled: false,
  transactions: [
    { id:'t1', type:'received', who:'Maya Chen', amount:120.00, note:'Concert tickets', date: Date.now()-3600e3*5 },
    { id:'t2', type:'sent', who:'Deji Osei', amount:45.50, note:'Lunch split', date: Date.now()-3600e3*26 },
    { id:'t3', type:'topup', who:'Bank account', amount:300.00, note:'Top up', date: Date.now()-3600e3*70 },
    { id:'t4', type:'sent', who:'Priya Nair', amount:18.00, note:'Coffee', date: Date.now()-3600e3*120 }
  ]
};

let state = loadState();
let pendingAction = null; // { kind, amount, who, note, source }
let activityFilter = 'all';
let sendDestination = 'bank';

function loadState(){
  try{
    const raw = localStorage.getItem('flow_state');
    if(raw) return Object.assign({}, DEFAULT_STATE, JSON.parse(raw));
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}
function saveState(){
  localStorage.setItem('flow_state', JSON.stringify(state));
}

function sym(){ return CURRENCY_SYMBOLS[state.currency] || '$'; }
function fmt(n){
  const v = Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  return sym()+v;
}
function timeAgo(ts){
  const diff = Date.now()-ts;
  const h = Math.floor(diff/3600e3);
  if(h < 1) return 'Just now';
  if(h < 24) return h+'h ago';
  const d = Math.floor(h/24);
  if(d < 7) return d+'d ago';
  return new Date(ts).toLocaleDateString();
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=>t.classList.remove('show'), 2200);
}
function notify(title, body){
  if(state.notifsEnabled && 'Notification' in window && Notification.permission === 'granted'){
    try{ new Notification(title, {body}); }catch(e){}
  }
}
function applyAccent(name){
  const map = { navy:'#3b6dff', steel:'#5a7ba6', coral:'#ff6b6b', gold:'#f5c542', blue:'#3b82f6' };
  document.documentElement.style.setProperty('--accent', map[name] || map.navy);
}
function applyTheme(){
  document.documentElement.setAttribute('data-theme', state.theme);
}

/* ---------- Navigation ---------- */
const screens = ['home','activity','send','request','topup','savings','status','txDetail','profile'];
function showScreen(name){
  screens.forEach(s=>{
    const el = document.getElementById(s+'Main');
    if(el) el.classList.toggle('hidden', s!==name);
  });
  const nav = document.getElementById('bottomNav');
  const showNav = ['home','activity','profile'].includes(name);
  nav.classList.toggle('hidden', !showNav);
  document.getElementById('homeActionBar').classList.toggle('hidden', name!=='home');
  document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active', b.dataset.nav===name));
  document.getElementById('statusActions').classList.add('hidden');
  window.scrollTo(0,0);
}

/* ---------- Dots helper ---------- */
function renderDots(container, len){
  const dots = container.querySelectorAll('span');
  dots.forEach((d,i)=>d.classList.toggle('filled', i<len));
}

/* ---------- Home ---------- */
function renderHome(){
  document.getElementById('homeGreeting').textContent = 'Hi, '+state.name.split(' ')[0];
  document.getElementById('balance').textContent = fmt(state.checkingBalance);
  document.getElementById('savingsBalanceDisplay').textContent = fmt(state.savingsBalance);
  renderTransactions(document.getElementById('activityPreview'), state.transactions.slice(0,4));
}
function renderSavings(){
  document.getElementById('savingsDetailBalance').textContent = fmt(state.savingsBalance);
  document.getElementById('withdrawCurrencySym').textContent = sym();
  document.getElementById('withdrawAmount').value = '';
}

/* ---------- Transactions list ---------- */
function txIcon(type){
  if(type==='sent') return '↑';
  if(type==='received') return '↓';
  if(type==='transfer') return '⇄';
  return '+';
}
function renderTransactions(container, list){
  container.innerHTML = '';
  if(!list.length){
    container.innerHTML = '<div class="empty-state">No transactions yet</div>';
    return;
  }
  list.forEach(tx=>{
    const row = document.createElement('div');
    row.className = 'tx-row';
    const positive = tx.type==='received' || tx.type==='topup' || (tx.type==='transfer' && tx.direction==='to_checking');
    row.innerHTML = `
      <div class="tx-icon ${tx.type}">${txIcon(tx.type)}</div>
      <div class="tx-mid"><b>${tx.who}</b><span>${tx.note || (tx.type==='topup'?'Top up':'')} · ${timeAgo(tx.date)}</span></div>
      <div class="tx-amt ${positive?'pos':'neg'}">${positive?'+':'-'}${fmt(tx.amount)}</div>
    `;
    row.addEventListener('click', ()=>openTxDetail(tx));
    container.appendChild(row);
  });
}
function openTxDetail(tx){
  const positive = tx.type==='received' || tx.type==='topup' || (tx.type==='transfer' && tx.direction==='to_checking');
  let label;
  if(tx.type==='sent') label = 'Sent to';
  else if(tx.type==='received') label = 'Received from';
  else if(tx.type==='transfer') label = tx.direction==='to_savings' ? 'Moved to' : 'Moved from';
  else label = 'Added from';
  document.getElementById('txDetailContent').innerHTML = `
    <div style="text-align:center;padding:10px 0 20px">
      <div class="tx-icon ${tx.type}" style="width:60px;height:60px;font-size:26px;margin:0 auto 14px">${txIcon(tx.type)}</div>
      <div style="font-size:28px;font-weight:800">${positive?'+':'-'}${fmt(tx.amount)}</div>
      <div style="color:var(--muted);font-size:13px;margin-top:4px">${label} ${tx.who}</div>
    </div>
    ${tx.bankName ? `<div class="field"><label>Bank</label><input value="${tx.bankName}" readonly></div>` : ''}
    ${tx.accountNumber ? `<div class="field"><label>Account number</label><input value="${tx.accountNumber}" readonly></div>` : ''}
    <div class="field"><label>Description</label><input value="${tx.note||'—'}" readonly></div>
    <div class="field"><label>Date</label><input value="${new Date(tx.date).toLocaleString()}" readonly></div>
    <div class="field"><label>Reference</label><input value="${tx.id.toUpperCase()}" readonly></div>
  `;
  showScreen('txDetail');
}

/* ---------- Activity page ---------- */
function renderActivity(){
  applyActivityFilter();
}
function applyActivityFilter(){
  const q = document.getElementById('searchTx').value.trim().toLowerCase();
  let list = state.transactions.slice();
  if(activityFilter!=='all') list = list.filter(t=>t.type===activityFilter);
  if(q) list = list.filter(t=> (t.who+' '+(t.note||'')).toLowerCase().includes(q));
  renderTransactions(document.getElementById('transactions'), list);
}

/* ---------- Send flow ---------- */
function openSend(prefill){
  document.getElementById('sendBankName').value = '';
  document.getElementById('sendAccountNumber').value = '';
  document.getElementById('sendAccountName').value = '';
  document.getElementById('sendAmount').value = '';
  document.getElementById('sendNote').value = '';
  document.getElementById('sendCurrencySym').textContent = sym();
  sendDestination = 'bank';
  document.querySelectorAll('#sendDestPicker .src-btn').forEach((b,i)=>b.classList.toggle('active', i===0));
  document.getElementById('sendBankFields').classList.remove('hidden');
  showScreen('send');
}
function openRequest(){
  document.getElementById('requestFrom').value = '';
  document.getElementById('requestAmount').value = '';
  document.getElementById('requestNote').value = '';
  document.getElementById('requestCurrencySym').textContent = sym();
  showScreen('request');
}
function openTopup(){
  document.getElementById('topupAmount').value = '';
  document.getElementById('topupCurrencySym').textContent = sym();
  document.querySelectorAll('#topupSourcePicker .src-btn').forEach((b,i)=>b.classList.toggle('active', i===0));
  document.querySelectorAll('.quick-amounts button').forEach(b=>b.classList.remove('active'));
  showScreen('topup');
}

function goConfirm(action){
  pendingAction = action;
  const summary = document.getElementById('confirmSummary');
  let label = '';
  if(action.kind==='send') label = 'To '+action.who+(action.bankName?' · '+action.bankName:'');
  else if(action.kind==='topup') label = 'From '+action.who;
  else if(action.kind==='transfer') label = action.direction==='to_savings' ? 'To your savings' : 'To your checking';
  summary.innerHTML = `<div class="amt">${fmt(action.amount)}</div><div class="to">${label}</div>`;
  document.getElementById('confirmError').classList.add('hidden');
  openPinSheet();
}
function openPinSheet(){
  const input = document.getElementById('confirmInput');
  input.value = '';
  renderDots(document.getElementById('confirmDots'), 0);
  document.getElementById('pinSheet').classList.remove('hidden');
  requestAnimationFrame(()=>{
    document.getElementById('pinSheet').classList.add('open');
  });
  setTimeout(()=>input.focus(), 280);
}
function closePinSheet(){
  const input = document.getElementById('confirmInput');
  input.blur();
  document.getElementById('pinSheet').classList.remove('open');
  setTimeout(()=>document.getElementById('pinSheet').classList.add('hidden'), 300);
}
function initConfirmInput(){
  const input = document.getElementById('confirmInput');
  input.addEventListener('input', ()=>{
    input.value = input.value.replace(/\D/g,'').slice(0,4);
    renderDots(document.getElementById('confirmDots'), input.value.length);
    document.getElementById('confirmError').classList.add('hidden');
    if(input.value.length===4){
      const entered = input.value;
      setTimeout(()=>{
        if(entered === state.passcode){
          input.blur();
          closePinSheet();
          executePendingAction();
        }else{
          const dots = document.getElementById('confirmDots');
          dots.classList.add('shake');
          document.getElementById('confirmError').classList.remove('hidden');
          setTimeout(()=>{
            dots.classList.remove('shake');
            input.value='';
            renderDots(dots,0);
            input.focus();
          },380);
        }
      },150);
    }
  });
  document.getElementById('pinSheetBackdrop').addEventListener('click', closePinSheet);
}

function executePendingAction(){
  const action = pendingAction;
  showStatus('pending', action);
  setTimeout(()=>{
    finalizeAction(action);
    showStatus('success', action);
  }, 11000);
}
function showStatus(kind, action){
  const body = document.getElementById('statusBody');
  const actions = document.getElementById('statusActions');
  const backBtn = document.getElementById('statusBackBtn');
  if(kind==='pending'){
    let verb = 'transfer';
    if(action.kind==='send') verb = 'transfer';
    else if(action.kind==='topup') verb = 'top up';
    else if(action.kind==='transfer') verb = action.direction==='to_savings' ? 'transfer to savings' : 'withdrawal';
    body.innerHTML = `
      <div class="status-icon pending spin">↻</div>
      <h2>Processing…</h2>
      <p>Hang tight, we're completing your ${verb} of ${fmt(action.amount)}.</p>
    `;
    actions.classList.add('hidden');
    backBtn.classList.add('hidden');
  }else{
    let verb;
    if(action.kind==='send') verb = 'sent to '+action.who;
    else if(action.kind==='topup') verb = 'added from '+action.who;
    else if(action.kind==='transfer') verb = action.direction==='to_savings' ? 'moved to savings' : 'moved to checking';
    body.innerHTML = `
      <div class="status-icon success">✓</div>
      <h2>All set!</h2>
      <p>${fmt(action.amount)} was successfully ${verb}.</p>
    `;
    actions.classList.remove('hidden');
    backBtn.classList.remove('hidden');
  }
  showScreen('status');
}
function finalizeAction(action){
  if(action.kind==='send'){
    state.checkingBalance -= action.amount;
    state.transactions.unshift({ id:'t'+Date.now(), type:'sent', who:action.who, amount:action.amount, note:action.note, date:Date.now(), bankName:action.bankName, accountNumber:action.accountNumber });
    notify('Money sent', fmt(action.amount)+' sent to '+action.who);
  }else if(action.kind==='topup'){
    state.checkingBalance += action.amount;
    state.transactions.unshift({ id:'t'+Date.now(), type:'topup', who:action.who, amount:action.amount, note:'Top up', date:Date.now() });
    notify('Balance updated', fmt(action.amount)+' added from '+action.who);
  }else if(action.kind==='transfer'){
    if(action.direction==='to_savings'){
      state.checkingBalance -= action.amount;
      state.savingsBalance += action.amount;
      state.transactions.unshift({ id:'t'+Date.now(), type:'transfer', direction:'to_savings', who:'Savings account', amount:action.amount, note:action.note, date:Date.now() });
      notify('Moved to savings', fmt(action.amount)+' moved to savings');
    }else{
      state.savingsBalance -= action.amount;
      state.checkingBalance += action.amount;
      state.transactions.unshift({ id:'t'+Date.now(), type:'transfer', direction:'to_checking', who:'Checking account', amount:action.amount, note:action.note, date:Date.now() });
      notify('Moved to checking', fmt(action.amount)+' moved to checking');
    }
  }
  saveState();
}

/* ---------- Profile ---------- */
function renderProfile(){
  document.getElementById('profileHeaderName').textContent = state.name;
  document.getElementById('profileHandle').textContent = state.handle;
  document.getElementById('profileName').value = state.name;
  document.getElementById('profileHandleInput').value = state.handle;
  document.getElementById('themeToggleBtn').textContent = state.theme==='dark' ? 'Switch to light mode' : 'Switch to dark mode';
  document.getElementById('notifToggleBtn').textContent = state.notifsEnabled ? 'Notifications enabled ✓' : 'Enable notifications';
  document.querySelectorAll('#currencySwatches .accent-swatch').forEach(b=>b.classList.toggle('active', b.dataset.currency===state.currency));
  document.querySelectorAll('#accentSwatches .accent-swatch').forEach(b=>b.classList.toggle('active', b.dataset.accent===state.accent));
}

/* ---------- Wire up ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  applyAccent(state.accent);
  applyTheme();
  initConfirmInput();

  setTimeout(()=>{
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    showScreen('home');
    renderHome();
  }, 1700);

  // Balance visibility
  let balanceHidden = false;
  document.getElementById('toggleBalance').addEventListener('click', ()=>{
    balanceHidden = !balanceHidden;
    document.getElementById('balance').textContent = balanceHidden ? '••••••' : fmt(state.checkingBalance);
  });

  // Home action buttons
  document.querySelectorAll('#homeActionBar [data-action]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const a = btn.dataset.action;
      if(a==='send') openSend();
      else if(a==='request') openRequest();
    });
  });
  document.getElementById('homeTopupBtn').addEventListener('click', openTopup);
  document.getElementById('savingsCard').addEventListener('click', ()=>{ showScreen('savings'); renderSavings(); });

  document.getElementById('seeAllBtn').addEventListener('click', ()=>{ showScreen('activity'); renderActivity(); });
  document.getElementById('profileBtn').addEventListener('click', ()=>{ showScreen('profile'); renderProfile(); });
  document.getElementById('notificationsBtn').addEventListener('click', ()=>{ toast('No new notifications'); });

  // Back buttons
  document.querySelectorAll('[data-back]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const target = btn.dataset.back;
      showScreen(target);
      if(target==='home') renderHome();
      if(target==='activity') renderActivity();
    });
  });
  document.getElementById('statusBackBtn').addEventListener('click', ()=>{
    showScreen('home');
    renderHome();
  });

  // Bottom nav
  document.querySelectorAll('.nav').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const n = btn.dataset.nav;
      showScreen(n);
      if(n==='home') renderHome();
      if(n==='activity') renderActivity();
      if(n==='profile') renderProfile();
    });
  });

  // Activity filters/search
  document.querySelectorAll('.filter').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activityFilter = btn.dataset.filter;
      applyActivityFilter();
    });
  });
  document.getElementById('searchTx').addEventListener('input', applyActivityFilter);

  // Send-to destination picker
  document.querySelectorAll('#sendDestPicker .src-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#sendDestPicker .src-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      sendDestination = btn.dataset.dest;
      document.getElementById('sendBankFields').classList.toggle('hidden', sendDestination==='savings');
    });
  });

  // Send flow
  document.getElementById('sendContinueBtn').addEventListener('click', ()=>{
    const amt = parseFloat(document.getElementById('sendAmount').value);
    const note = document.getElementById('sendNote').value.trim();
    if(!amt || amt<=0){ toast('Enter a valid amount'); return; }
    if(amt > state.checkingBalance){ toast('Insufficient balance'); return; }
    if(sendDestination === 'savings'){
      goConfirm({ kind:'transfer', direction:'to_savings', amount:amt, note: note || 'Transfer to savings' });
      return;
    }
    const bankName = document.getElementById('sendBankName').value.trim();
    const accountNumber = document.getElementById('sendAccountNumber').value.trim();
    const accountName = document.getElementById('sendAccountName').value.trim();
    if(!bankName){ toast('Enter the bank name'); return; }
    if(!accountNumber){ toast('Enter the account number'); return; }
    if(!accountName){ toast('Enter the account name'); return; }
    goConfirm({ kind:'send', who:accountName, bankName, accountNumber, amount:amt, note });
  });

  // Request flow (simulated — just logs a pending request notice)
  document.getElementById('requestSendBtn').addEventListener('click', ()=>{
    const who = document.getElementById('requestFrom').value.trim();
    const amt = parseFloat(document.getElementById('requestAmount').value);
    if(!who){ toast('Enter who you\'re requesting from'); return; }
    if(!amt || amt<=0){ toast('Enter a valid amount'); return; }
    toast('Request for '+fmt(amt)+' sent to '+who);
    showScreen('home');
    renderHome();
  });

  // Top up flow
  document.querySelectorAll('#topupSourcePicker .src-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#topupSourcePicker .src-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('.quick-amounts button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.quick-amounts button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('topupAmount').value = btn.dataset.amt;
    });
  });
  document.getElementById('topupContinueBtn').addEventListener('click', ()=>{
    const amt = parseFloat(document.getElementById('topupAmount').value);
    if(!amt || amt<=0){ toast('Enter a valid amount'); return; }
    const srcBtn = document.querySelector('#topupSourcePicker .src-btn.active');
    const source = srcBtn.dataset.src==='card' ? 'Debit card' : 'Bank account';
    goConfirm({ kind:'topup', who:source, amount:amt });
  });

  // Savings withdrawal
  document.getElementById('withdrawContinueBtn').addEventListener('click', ()=>{
    const amt = parseFloat(document.getElementById('withdrawAmount').value);
    if(!amt || amt<=0){ toast('Enter a valid amount'); return; }
    if(amt > state.savingsBalance){ toast('Insufficient savings balance'); return; }
    goConfirm({ kind:'transfer', direction:'to_checking', amount:amt, note:'Withdrawal to checking' });
  });

  document.getElementById('statusDoneBtn').addEventListener('click', ()=>{
    showScreen('home');
    renderHome();
  });

  // Profile actions
  document.getElementById('saveProfileBtn').addEventListener('click', ()=>{
    state.name = document.getElementById('profileName').value.trim() || state.name;
    state.handle = document.getElementById('profileHandleInput').value.trim() || state.handle;
    saveState();
    renderProfile();
    toast('Profile saved');
  });
  document.getElementById('themeToggleBtn').addEventListener('click', ()=>{
    state.theme = state.theme==='dark' ? 'light' : 'dark';
    applyTheme();
    saveState();
    renderProfile();
  });
  document.getElementById('notifToggleBtn').addEventListener('click', async ()=>{
    if(!('Notification' in window)){ toast('Notifications not supported here'); return; }
    if(Notification.permission === 'granted'){
      state.notifsEnabled = !state.notifsEnabled;
    }else{
      const perm = await Notification.requestPermission();
      state.notifsEnabled = perm === 'granted';
    }
    saveState();
    renderProfile();
    toast(state.notifsEnabled ? 'Notifications enabled' : 'Notifications off');
  });
  document.querySelectorAll('#currencySwatches .accent-swatch').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.currency = btn.dataset.currency;
      saveState();
      renderProfile();
      toast('Currency updated');
    });
  });
  document.querySelectorAll('#accentSwatches .accent-swatch').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.accent = btn.dataset.accent;
      applyAccent(state.accent);
      saveState();
      renderProfile();
    });
  });
  document.getElementById('changePasscodeBtn').addEventListener('click', ()=>{
    const p1 = prompt('New 4-digit passcode');
    if(p1 && /^\d{4}$/.test(p1)){
      state.passcode = p1;
      saveState();
      toast('Passcode updated');
    }else if(p1){
      toast('Passcode must be 4 digits');
    }
  });
  document.getElementById('clearHistoryBtn').addEventListener('click', ()=>{
    if(confirm('Clear all transaction history?')){
      state.transactions = [];
      saveState();
      toast('History cleared');
    }
  });
  document.getElementById('resetAppBtn').addEventListener('click', ()=>{
    if(confirm('Reset the app to its default state? This clears everything.')){
      localStorage.removeItem('flow_state');
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      applyAccent(state.accent);
      applyTheme();
      renderHome();
      renderProfile();
      showScreen('home');
      toast('App reset');
    }
  });
});
})();
