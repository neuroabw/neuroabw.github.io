(() => {
  const config = window.ILLUMINATED_CONFIG || {};
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navLinks = document.querySelector('[data-nav-links]');

  navToggle?.addEventListener('click', () => {
    if (!navLinks) return;
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.body.classList.toggle('nav-open', open);
  });

  navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
      navToggle?.setAttribute('aria-label', 'Open navigation');
      document.body.classList.remove('nav-open');
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !navLinks?.classList.contains('open')) return;
    navLinks.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Open navigation');
    document.body.classList.remove('nav-open');
    navToggle?.focus();
  });

  document.querySelectorAll('[data-phone]').forEach((element) => {
    element.textContent = config.phoneDisplay || '254-900-2002';
    if (element.tagName === 'A') element.href = `tel:${config.phoneHref || '+12549002002'}`;
  });
  document.querySelectorAll('[data-email]').forEach((element) => {
    const email = config.estimateEmail || 'illuminated@neuronaut.live';
    element.textContent = email;
    if (element.tagName === 'A') element.href = `mailto:${email}`;
  });

  const estimateForm = document.querySelector('#estimate-form');
  const formMessage = document.querySelector('#form-message');
  estimateForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!estimateForm.reportValidity()) return;

    const data = new FormData(estimateForm);
    const name = String(data.get('name') || '').trim();
    const address = String(data.get('address') || '').trim();
    const email = String(data.get('email') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const service = String(data.get('service') || '').trim();
    const timing = String(data.get('timing') || '').trim();
    const notes = String(data.get('notes') || '').trim();
    const recipient = config.estimateEmail || 'illuminated@neuronaut.live';

    const subject = `Estimate Request — ${name} — ${address}`;
    const body = [
      'Hello Illuminated,',
      '',
      'I would like a free photo estimate.',
      '',
      `Name: ${name}`,
      `Property address: ${address}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Service: ${service}`,
      `Preferred timing: ${timing || 'Not specified'}`,
      '',
      'Project notes:',
      notes || 'No additional notes provided.',
      '',
      'I will attach clear photos of the front of the home and any other areas I would like included.',
      '',
      'Thank you.'
    ].join('\r\n');

    if (formMessage) formMessage.textContent = 'Your email app is opening. Attach your photos, then press Send.';
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 })
    : null;

  document.querySelectorAll('.reveal').forEach((element) => {
    if (observer) observer.observe(element);
    else element.classList.add('is-visible');
  });

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
