const mode = document.querySelector('#mode');
const flip = el => el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') !== 'true');

mode.addEventListener('click', () => {
  flip(mode);
  document.body.classList.toggle('reveal', mode.getAttribute('aria-pressed') !== 'true');
});

document.querySelector('.deck').addEventListener('click', e => {
  const card = e.target.closest('.card');
  if (card && !document.body.classList.contains('reveal')) flip(card);
});
