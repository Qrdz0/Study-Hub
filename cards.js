const items = [...document.querySelector('.deck').children];
const [mode, prev, next, count, bar] = ['#mode', '#prev', '#next', '#count', '#bar'].map(s => document.querySelector(s));
const flip = el => el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') !== 'true');
const reveal = () => document.body.classList.contains('reveal');
let i = 0;

const show = n => {
  items[i].classList.remove('on');
  items[i].querySelector('.card').setAttribute('aria-pressed', 'false');
  i = n;
  items[i].classList.add('on');
  count.textContent = `${i + 1} / ${items.length}`;
  bar.value = i + 1;
  prev.disabled = i === 0;
  next.disabled = i === items.length - 1;
};

bar.max = items.length;
show(0);

mode.addEventListener('click', () => {
  flip(mode);
  document.body.classList.toggle('reveal', mode.getAttribute('aria-pressed') !== 'true');
});
prev.addEventListener('click', () => show(i - 1));
next.addEventListener('click', () => show(i + 1));
items.forEach(li => li.addEventListener('click', e => reveal() || flip(e.currentTarget.querySelector('.card'))));
document.addEventListener('keydown', e => {
  if (reveal()) return;
  if (e.key === 'ArrowLeft' && i > 0) show(i - 1);
  if (e.key === 'ArrowRight' && i < items.length - 1) show(i + 1);
});
