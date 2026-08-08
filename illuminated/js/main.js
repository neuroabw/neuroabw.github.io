(() => {
  const config = window.ILLUMINATED_CONFIG || {};
  const leadsApiBaseUrl = String(config.leadsApiBaseUrl || '').replace(/\/+$/, '');
  const maxClientPhotos = 6;
  const allowedPhotoMimeTypes = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]);
  const allowedPhotoExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
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
  const submitButton = estimateForm?.querySelector('[data-submit-button]');
  const photoInput = estimateForm?.querySelector('#propertyPhotos');
  const turnstileContainer = estimateForm?.querySelector('#estimate-turnstile');
  let turnstileWidgetId = null;

  const setFormMessage = (text, state = '') => {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.classList.remove('is-error', 'is-success', 'is-warning');
    if (state) formMessage.classList.add(`is-${state}`);
  };

  const focusFormMessage = () => {
    if (!formMessage || !formMessage.textContent) return;
    formMessage.setAttribute('tabindex', '-1');
    formMessage.focus();
  };

  const setSubmittingState = (isSubmitting, label = 'Request my free estimate') => {
    if (!estimateForm) return;
    estimateForm.querySelectorAll('input, select, textarea, button').forEach((field) => {
      if (field.id === 'company') return;
      field.disabled = isSubmitting;
    });
    if (submitButton) submitButton.textContent = label;
  };

  const isAllowedPhotoFile = (file) => {
    const type = String(file.type || '').toLowerCase();
    const name = String(file.name || '').toLowerCase();
    return allowedPhotoMimeTypes.has(type) || allowedPhotoExtensions.some((extension) => name.endsWith(extension));
  };

  const getUploadId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const resetTurnstile = () => {
    if (turnstileWidgetId !== null && window.turnstile?.reset) window.turnstile.reset(turnstileWidgetId);
  };

  const resolveTurnstileToken = () => {
    if (turnstileWidgetId === null || !window.turnstile?.getResponse) return '';
    return String(window.turnstile.getResponse(turnstileWidgetId) || '').trim();
  };

  const renderTurnstileWidget = (attempt = 0) => {
    if (!estimateForm || !turnstileContainer || turnstileWidgetId !== null) return;
    const siteKey = String(config.turnstileSiteKey || '').trim();
    if (!siteKey || siteKey.includes('REPLACE_WITH')) {
      setFormMessage('Verification is temporarily unavailable. Please try again shortly.', 'error');
      submitButton?.setAttribute('disabled', 'disabled');
      return;
    }
    if (!window.turnstile?.render) {
      if (attempt >= 30) {
        setFormMessage('Unable to load verification. Refresh and try again.', 'error');
        return;
      }
      window.setTimeout(() => renderTurnstileWidget(attempt + 1), 250);
      return;
    }
    turnstileWidgetId = window.turnstile.render(turnstileContainer, {
      sitekey: siteKey,
      action: 'estimate_request',
      theme: 'light'
    });
  };

  photoInput?.addEventListener('change', () => {
    const files = Array.from(photoInput.files || []);
    if (files.length > maxClientPhotos) {
      photoInput.setCustomValidity(`Please choose no more than ${maxClientPhotos} photos.`);
      photoInput.reportValidity();
      return;
    }
    const unsupportedFile = files.find((file) => !isAllowedPhotoFile(file));
    if (unsupportedFile) {
      photoInput.setCustomValidity('Please choose JPG, PNG, WebP, HEIC, or HEIF images only.');
      photoInput.reportValidity();
      return;
    }
    photoInput.setCustomValidity('');
  });

  estimateForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!estimateForm.reportValidity()) return;
    if (!leadsApiBaseUrl) {
      setFormMessage('Estimate submission is temporarily unavailable. Please call us directly.', 'error');
      focusFormMessage();
      return;
    }

    const selectedPhotos = Array.from(photoInput?.files || []);
    if (selectedPhotos.length > maxClientPhotos) {
      photoInput?.setCustomValidity(`Please choose no more than ${maxClientPhotos} photos.`);
      photoInput?.reportValidity();
      return;
    }
    const unsupportedPhoto = selectedPhotos.find((file) => !isAllowedPhotoFile(file));
    if (unsupportedPhoto) {
      photoInput?.setCustomValidity('Please choose JPG, PNG, WebP, HEIC, or HEIF images only.');
      photoInput?.reportValidity();
      return;
    }
    if (photoInput) photoInput.setCustomValidity('');

    const turnstileToken = resolveTurnstileToken();
    if (!turnstileToken) {
      setFormMessage('Please complete verification before submitting your request.', 'error');
      turnstileContainer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      focusFormMessage();
      return;
    }

    const data = new FormData(estimateForm);
    const leadPayload = {
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim(),
      address: String(data.get('address') || '').trim(),
      service: String(data.get('service') || '').trim(),
      timing: String(data.get('timing') || '').trim(),
      contactMethod: String(data.get('contactMethod') || '').trim(),
      notes: String(data.get('notes') || '').trim(),
      contactConsent: Boolean(data.get('contactConsent')),
      turnstileToken,
      company: String(data.get('company') || '').trim()
    };

    setSubmittingState(true, 'Submitting request…');
    setFormMessage('Submitting your estimate request…');

    let lead;
    try {
      const response = await fetch(`${leadsApiBaseUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadPayload)
      });
      if (!response.ok) throw new Error('Lead creation failed');
      lead = await response.json();
    } catch (error) {
      setFormMessage('We could not submit your request right now. Please try again or call us directly.', 'error');
      setSubmittingState(false);
      resetTurnstile();
      focusFormMessage();
      return;
    }

    const leadId = String(lead?.leadId || '').trim();
    const leadNumber = String(lead?.leadNumber || '').trim() || leadId;
    if (!leadId || !leadNumber) {
      setFormMessage('We could not confirm your request number. Please try again or call us directly.', 'error');
      setSubmittingState(false);
      resetTurnstile();
      focusFormMessage();
      return;
    }
    const uploadToken = String(lead?.uploadToken || '').trim();
    const maxPhotos = Math.max(0, Number.parseInt(String(lead?.maxPhotos || ''), 10) || maxClientPhotos);
    const maxPhotoBytes = Math.max(0, Number.parseInt(String(lead?.maxPhotoBytes || ''), 10) || 0);
    const photosToUpload = selectedPhotos.slice(0, maxPhotos);
    const skippedPhotoCount = selectedPhotos.length - photosToUpload.length;

    const failedPhotoNames = [];
    if (leadId && uploadToken && photosToUpload.length > 0) {
      for (let index = 0; index < photosToUpload.length; index += 1) {
        const file = photosToUpload[index];
        if (maxPhotoBytes > 0 && file.size > maxPhotoBytes) {
          failedPhotoNames.push(file.name);
          continue;
        }
        setSubmittingState(true, `Uploading photo ${index + 1} of ${photosToUpload.length}…`);
        setFormMessage(`Uploading photo ${index + 1} of ${photosToUpload.length}…`);
        try {
          const uploadHeaders = new Headers({
            'X-Upload-Id': getUploadId(),
            'X-File-Name': file.name,
            'X-File-Size': String(file.size),
            'Content-Type': file.type || 'application/octet-stream'
          });
          uploadHeaders.set('Authorization', 'Bearer ' + uploadToken);
          const uploadResponse = await fetch(`${leadsApiBaseUrl}/api/leads/${encodeURIComponent(leadId)}/photos`, {
            method: 'POST',
            headers: uploadHeaders,
            body: file
          });
          if (!uploadResponse.ok) failedPhotoNames.push(file.name);
        } catch (error) {
          failedPhotoNames.push(file.name);
        }
      }
    }

    const hadUploadIssue = failedPhotoNames.length > 0 || skippedPhotoCount > 0;
    if (hadUploadIssue) {
      setFormMessage(
        `Thanks — your estimate request was received (Lead #${leadNumber}), but some photos could not be uploaded. We can request any missing photos if needed.`,
        'warning'
      );
    } else {
      setFormMessage(`Thanks — your estimate request was received (Lead #${leadNumber}).`, 'success');
    }

    estimateForm.reset();
    resetTurnstile();
    setSubmittingState(false);
    focusFormMessage();
  });

  renderTurnstileWidget();

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
