const progressBar = document.querySelector('[data-reading-progress]');

function updateProgress() {
  if (!progressBar) return;
  const root = document.documentElement;
  const total = root.scrollHeight - root.clientHeight;
  const progress = total > 0 ? Math.min(100, (root.scrollTop / total) * 100) : 0;
  progressBar.style.width = `${progress}%`;
}

window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

/* --------------------------------------------------------------------------
   WIKI ENGLISH — appended, additive only. Adds one "back to your learning
   path" bar at the top of every generated lesson page. Fully guarded: any
   failure is swallowed so a lesson page can never be broken by this code.
   -------------------------------------------------------------------------- */
(function () {
  try {
    if (document.querySelector('.we-path-return')) return;
    var header = document.querySelector('.site-header');
    if (!header) return;
    var bar = document.createElement('div');
    bar.className = 'we-path-return';
    var link = document.createElement('a');
    link.href = '../index.html';
    link.textContent = '‹ WIKI ENGLISH — o‘quv yo‘lingizga qaytish';
    bar.appendChild(link);
    document.body.insertBefore(bar, document.body.firstChild);
  } catch (err) {
    /* never break a lesson page over a nav affordance */
  }
})();
