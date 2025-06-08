document.addEventListener('DOMContentLoaded', () => {
  const hud = document.getElementById('phase-hud');
  const sections = document.querySelectorAll('section[id^="phase"]');

  const fragments = [
    '⊘ Source spark',
    '✶ Light fracture',
    '∞ Rhythm echo',
    '⬣ Darkness fold',
    '⧗ Reflection pause',
    '⋰ Endurance rise',
    '▦ Order imprint',
    '✧ Separation veil',
    '⟡ Conscience flare',
    '✵ Threshold breach',
    '★ Resurrection return'
  ];

  sections.forEach((section, idx) => {
    const frag = document.createElement('div');
    frag.className = 'fragment reveal';
    frag.textContent = fragments[idx] || '';
    section.appendChild(frag);

    const particles = document.createElement('div');
    particles.className = 'particles reveal';
    for (let i = 0; i < 6; i++) {
      const span = document.createElement('span');
      span.className = 'particle';
      span.style.left = Math.random() * 100 + '%';
      span.style.animationDelay = (Math.random() * 2) + 's';
      particles.appendChild(span);
    }
    section.appendChild(particles);
  });

  let active = null;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.intersectionRatio >= 0.5) {
        active = entry.target;
        entry.target.classList.add('in-view');
        const title = entry.target.querySelector('h1');
        if (title) {
          hud.textContent = title.textContent.trim();
          hud.classList.add('show');
        }
      } else if (active === entry.target) {
        hud.classList.remove('show');
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(section => observer.observe(section));
});
