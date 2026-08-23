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
