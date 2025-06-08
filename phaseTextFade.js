document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        obs.unobserve(entry.target);
      }
    });
  });

  document.querySelectorAll('.phase-text').forEach(el => observer.observe(el));
});
