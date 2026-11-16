const $ = s => document.querySelector(s);
const items = [...$('.deck').children];
const [prev, next, count, bar, reveal] = ['#prev', '#next', '#count', '#bar', '#show'].map($);
const key = `progress:${location.pathname}`;
// storage throws in some private modes; progress just won't persist there
const store = fn => { try { return fn(localStorage); } catch {} };
const card = () => items[i].querySelector('.card');
const flip = c => c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true');
const mode = () => document.body.dataset.mode;
let i = 0;

const show = n => {
  items[i].classList.remove('on');
  card().setAttribute('aria-pressed', 'false');
  i = n;
  items[i].classList.add('on');
  count.textContent = `${i + 1} / ${items.length}`;
  bar.value = i + 1;
  prev.disabled = i === 0;
  next.disabled = i === items.length - 1;
  reveal.textContent = 'Toon antwoord';
};
const go = n => {
  if (n < 0 || n >= items.length) return;
  show(n);
  store(s => s.setItem(key, n));
};

document.body.dataset.mode = $('.modes :checked').value;
bar.max = items.length;
show(Math.max(0, Math.min(items.length - 1, parseInt(store(s => s.getItem(key))) || 0)));

$('.modes').addEventListener('change', e => {
  document.body.dataset.mode = e.target.value;
  show(i);
});
prev.addEventListener('click', () => go(i - 1));
next.addEventListener('click', () => go(i + 1));
reveal.addEventListener('click', () => {
  flip(card());
  reveal.textContent = card().getAttribute('aria-pressed') === 'true' ? 'Verberg antwoord' : 'Toon antwoord';
});
$('#reset').addEventListener('click', () => {
  store(s => s.removeItem(key));
  show(0);
});
items.forEach(li => li.addEventListener('click', () => mode() === 'study' && flip(card())));
document.addEventListener('keydown', e => {
  if (mode() === 'list' || e.target.closest('.modes')) return;
  if (e.key === 'ArrowLeft') go(i - 1);
  if (e.key === 'ArrowRight') go(i + 1);
});
