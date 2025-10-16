const qs = s => document.querySelector(s);
const $chat = qs('.chat');
const $launcher = qs('.chat-launcher');
const $log = qs('#log');
const $typing = qs('#typing');
const $input = qs('#input');
const $composer = qs('#composer');
const $themeToggle = qs('#themeToggle');
const $close = qs('#closeChat');
const $attachBtn = qs('#attachBtn');
const $attach = qs('#attach');

let state = {
  open: false,
  typing: false,
  messages: JSON.parse(localStorage.getItem('pidima-chat') || '[]'),
  theme: localStorage.getItem('pidima-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
};

document.documentElement.setAttribute('data-theme', state.theme);

// --- Chat section open/close
const setOpen = (v) => {
  state.open = v;
  $chat.setAttribute('aria-hidden', String(!v));
  if (v) setTimeout(() => $input.focus(), 0);
};
$launcher.addEventListener('click', () => setOpen(true));
$close.addEventListener('click', () => setOpen(false));

document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

// --- Theme
$themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('pidima-theme', state.theme);
});

// --- Rendering
function fmt(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
function render() {
  $log.innerHTML = state.messages.map(m => `
    <article class="msg ${m.author==='user'?'msg--me':''}" aria-label="${m.author==='user'?'You':'Assistant'} at ${fmt(m.ts)}" title="${new Date(m.ts).toLocaleString()}" data-id="${m.id}">
      <div class="msg__text">${escapeHtml(m.text)}</div>
      <div class="msg__meta">
        <span>${fmt(m.ts)}</span>
        ${m.author==='user' && m.status ? `<span>${m.status}</span>`:''}
      </div>
    </article>
  `).join('');
  requestAnimationFrame(() => $log.scrollTop = $log.scrollHeight);
  localStorage.setItem('pidima-chat', JSON.stringify(state.messages));
}
function escapeHtml(s){return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}


// --- Message status

function setStatus(id, status) {
  const el = $log.querySelector(`.msg[data-id="${id}"] .msg__status`);
  if (el) el.textContent = status;
}

// --- Send flow
$composer.addEventListener('submit', e => {
  e.preventDefault();
  $typing.setAttribute('aria-hidden', 'false');
  $typing.style.visibility='visible';
  const text = $input.value.trim();
  if (!text) return;
  pushUser(text);
  $input.value = '';
  autoGrow();
  mockBot(text);
});
$input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $composer.requestSubmit(); }
});
$input.addEventListener('input', autoGrow);

function autoGrow(){
  $input.style.height = 'auto';
  $input.style.height = Math.min($input.scrollHeight, 160) + 'px';
}

function pushUser(text){
  const m = { id: crypto.randomUUID(), author:'user', text, ts: Date.now(), status:'sending' };
  state.messages.push(m);
  render();
  setTimeout(()=>{ m.status='sent';      setStatus(m.id, 'sent');      }, 150);
  setTimeout(()=>{ m.status='delivered'; setStatus(m.id, 'delivered'); }, 600);
  setTimeout(()=>{ m.status='read';      setStatus(m.id, 'read');      }, 900);
}

// --- Typing + reply (mock AI)
function mockBot(userText){
  
  state.typing = true; $typing.hidden = false;
  const reply = simpleReply(userText);
  setTimeout(()=>{
    state.typing = false; $typing.hidden = true;
    state.messages.push({ id: crypto.randomUUID(), author:'bot', text: reply, ts: Date.now() });
    render();
    $typing.style.visibility='hidden'
    $typing.setAttribute('aria-hidden', 'true')
  }, 1000 + Math.min(1200, userText.length*20));

}
function simpleReply(t){
  const low = t.toLowerCase();
  if (low.includes('hello') || low.includes('hi')) return 'Hello! I can help you explore documentation. Try “search pagination limits”.';
  if (low.includes('doc') || low.includes('search')) return 'Docs tip: use the sidebar filters or type “/search <term>”.';
  return `You said: "${t}". (In a real app, this calls Pidima’s API.)`;
}

// --- Attach (preview just the name for now)
$attachBtn.addEventListener('click', ()=> $attach.click());
$attach.addEventListener('change', () => {
  if ($attach.files?.length) {
    pushUser(`Attached: ${[...$attach.files].map(f=>f.name).join(', ')}`);
  }
});


// --- Boot
render();
