// Define handleBooking early so it's available immediately
window.handleBooking = (event) => {
  console.warn('⚠️ handleBooking stub called - real function not yet initialized');
  event.preventDefault();
  return false;
};

document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (navToggle && navMenu) {
    const closeMenu = () => {
      navMenu.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => closeMenu());
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        closeMenu();
      }
    });
  }

  const bookingState = {
    selectedDate: '',
    selectedTime: '',
    selectedPackage: '',
    selectedPackageName: '',
    selectedPackagePrice: '',
    selectedPackageAmount: null,
    selectedPackageCurrency: '',
    csrfToken: null,
    packageInput: document.getElementById('selected-package'),
    packageHint: document.querySelector('[data-package-hint]'),
    packageOptions: Array.from(document.querySelectorAll('[data-package-option]')),
    packagePriceElements: new Map(),
    packages: new Map(),
    errorMessage: document.querySelector('[data-booking-error]'),
    submitButton: null,
    summaryContainer: null,
    summaryText: null,
    dateInput: document.getElementById('selected-date'),
    timeInput: document.getElementById('selected-time'),
    location: null,
    clearPackageSelection: null,
    customerName: '',
    customerEmail: '',
    customerPhone: ''
  };

  const PACKAGE_CATALOG_STORAGE_KEY = 'booking.packageCatalog.v1';

  bookingState.packageOptions.forEach((button) => {
    if (button.dataset.packageId) {
      const priceEl = button.querySelector('[data-package-price]');
      bookingState.packagePriceElements.set(button.dataset.packageId, priceEl);
    }
  });

  const syncSubmitState = () => {
    if (!bookingState.submitButton) {
      return;
    }
    const ready = Boolean(
      bookingState.selectedDate &&
      bookingState.selectedTime &&
      bookingState.selectedPackage &&
      bookingState.customerName.trim() &&
      bookingState.customerEmail.trim() &&
      bookingState.customerPhone.trim()
    );
    bookingState.submitButton.disabled = !ready;
  };

  const showBookingError = (message) => {
    if (!bookingState.errorMessage) {
      return;
    }
    bookingState.errorMessage.textContent = message;
    bookingState.errorMessage.classList.remove('hidden');
  };

  const clearBookingError = () => {
    if (!bookingState.errorMessage) {
      return;
    }
    bookingState.errorMessage.textContent = '';
    bookingState.errorMessage.classList.add('hidden');
  };

  const updatePackagePriceDisplay = (pkgId, formattedPrice) => {
    const element = bookingState.packagePriceElements.get(pkgId);
    if (element) {
      element.textContent = formattedPrice || 'Price shown at checkout';
    }
  };

  const applyPackageCatalog = (packages) => {
    const list = Array.isArray(packages) ? packages : [];
    bookingState.packages.clear();
    list.forEach((pkg) => {
      bookingState.packages.set(pkg.id, pkg);
      updatePackagePriceDisplay(pkg.id, pkg.formattedPrice);
      if (bookingState.selectedPackage === pkg.id) {
        bookingState.selectedPackagePrice = pkg.formattedPrice || bookingState.selectedPackagePrice;
        bookingState.selectedPackageAmount = pkg.amount ?? bookingState.selectedPackageAmount;
        bookingState.selectedPackageCurrency = pkg.currency || bookingState.selectedPackageCurrency;
      }
    });
    document.dispatchEvent(new CustomEvent('packages:updated', { detail: { packages: list } }));
  };

  const applyStoredPackageCatalog = () => {
    try {
      const stored = window.sessionStorage?.getItem(PACKAGE_CATALOG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          applyPackageCatalog(parsed);
        }
      }
    } catch (error) {
      console.warn('Unable to read package catalogue from session storage.', error);
    }
  };

  const loadPackageCatalog = async () => {
    try {
      const response = await fetch('/api/packages', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      const packages = data.packages || [];
      applyPackageCatalog(packages);
      try {
        window.sessionStorage?.setItem(PACKAGE_CATALOG_STORAGE_KEY, JSON.stringify(packages));
      } catch (storageError) {
        console.warn('Unable to store package catalogue in session storage.', storageError);
      }
    } catch (error) {
      console.error('Package catalogue error:', error);
      bookingState.packagePriceElements.forEach((element) => {
        if (element) {
          element.textContent = 'Price shown at checkout';
        }
      });
      document.dispatchEvent(new CustomEvent('packages:updated', { detail: { packages: [] } }));
    }
  };

  applyStoredPackageCatalog();
  const calendarRoot = document.querySelector('[data-calendar]');
  if (calendarRoot) {
    setupBookingCalendar(calendarRoot);
  }

  loadPackageCatalog();

  window.handleBooking = async (event) => {
    console.log('🎄 handleBooking called with event:', event?.type);

    // CRITICAL: Prevent default form submission FIRST
    event.preventDefault();
    console.log('✅ event.preventDefault() called');

    // Then handle the booking
    const form = event.target instanceof HTMLFormElement
      ? event.target
      : event.currentTarget instanceof HTMLFormElement
        ? event.currentTarget
        : null;

    if (!form) {
      console.warn('❌ No form element found!');
      return false;
    }
    console.log('✅ Form found:', form.id);

    if (!form.reportValidity()) {
      return false;
    }

    if (!bookingState.selectedDate || !bookingState.selectedTime) {
      console.warn('❌ Missing date/time', { selectedDate: bookingState.selectedDate, selectedTime: bookingState.selectedTime });
      showBookingError('Please select a session date and time before continuing.');
      return false;
    }

    if (!bookingState.selectedPackage) {
      console.warn('❌ Missing package', { selectedPackage: bookingState.selectedPackage });
      showBookingError('Please choose a package to pre-purchase before checking out.');
      return false;
    }

    if (!bookingState.customerName.trim() || !bookingState.customerEmail.trim() || !bookingState.customerPhone.trim()) {
      console.warn('❌ Missing customer details', { name: bookingState.customerName, email: bookingState.customerEmail, phone: bookingState.customerPhone });
      showBookingError('Please add your name, email and mobile number before continuing.');
      return false;
    }

    clearBookingError();

    const submitButton = bookingState.submitButton || form.querySelector('[data-calendar-submit]');
    const originalLabel = submitButton ? submitButton.textContent : '';
    let redirecting = false;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Redirecting...';
    }

    try {
      const csrfToken = await ensureCsrfToken();
      const payload = {
        selectedDate: bookingState.selectedDate,
        selectedTime: bookingState.selectedTime,
        packageId: bookingState.selectedPackage,
        packageName: bookingState.selectedPackageName,
        location: form.dataset.location || bookingState.location || 'Tramsheds, 1 Dalgal Way, Forest Lodge NSW 2037',
        customerName: bookingState.customerName.trim(),
        customerEmail: bookingState.customerEmail.trim(),
        customerPhone: bookingState.customerPhone.trim(),
        packagePrice: bookingState.selectedPackagePrice,
        packageAmount: bookingState.selectedPackageAmount,
        packageCurrency: bookingState.selectedPackageCurrency
      };

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      console.log('📡 Checkout response:', response.status, response.statusText);
      const data = await response.json().catch(() => ({}));
      console.log('📦 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'We were unable to start the checkout. Please try again.');
      }

      if (data && data.url) {
        console.log('🎯 Redirecting to Stripe:', data.url);
        redirecting = true;
        window.location.href = data.url;
        return false;
      }

      throw new Error('Checkout session was created without a redirect URL.');
    } catch (error) {
      console.error('❌ Booking error:', error);
      showBookingError(error.message || 'Something went wrong. Please try again.');
    } finally {
      if (submitButton && !redirecting) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
        syncSubmitState();
      }
    }

    return false;
  };

  async function ensureCsrfToken() {
    if (bookingState.csrfToken) {
      return bookingState.csrfToken;
    }

    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Unable to secure booking. Please refresh and try again.');
    }

    const data = await response.json();
    bookingState.csrfToken = data.token;
    return bookingState.csrfToken;
  }

  function setupPackageSelector(state, syncSubmitState, clearError, onPackageSelect) {
    if (!state.packageInput || !state.packageOptions || state.packageOptions.length === 0) {
      return null;
    }

    const options = state.packageOptions;
    const hint = state.packageHint;

    options.forEach((option) => option.setAttribute('aria-pressed', 'false'));

    const emitSelection = (meta) => {
      if (typeof onPackageSelect === 'function') {
        onPackageSelect(meta);
      }
    };

    const clearSelection = () => {
      options.forEach((option) => {
        option.classList.remove('package-option--selected');
        option.setAttribute('aria-pressed', 'false');
      });
      state.selectedPackage = '';
      state.selectedPackageName = '';
      state.selectedPackagePrice = '';
      state.selectedPackageAmount = null;
      state.selectedPackageCurrency = '';
      if (state.packageInput) {
        state.packageInput.value = '';
      }
      if (hint) {
        hint.textContent = 'Select a package to continue.';
        hint.classList.remove('calendar-packages__hint--selected');
      }
      if (typeof clearError === 'function') {
        clearError();
      }
      emitSelection(null);
      syncSubmitState();
    };

    options.forEach((option) => {
      option.addEventListener('click', () => {
        const packageId = option.dataset.packageId;
        const packageName = option.dataset.packageName
          || option.querySelector('.package-option__name')?.textContent
          || packageId;

        options.forEach((btn) => {
          btn.classList.toggle('package-option--selected', btn === option);
          btn.setAttribute('aria-pressed', String(btn === option));
        });

        state.selectedPackage = packageId;
        state.selectedPackageName = packageName;
        if (state.packageInput) {
          state.packageInput.value = packageId;
        }
        const meta = state.packages.get(packageId) || {
          id: packageId,
          name: packageName,
          formattedPrice: state.packagePriceElements.get(packageId)?.textContent || '',
          amount: null,
          currency: null
        };
        state.selectedPackagePrice = meta.formattedPrice || state.packagePriceElements.get(packageId)?.textContent || '';
        state.selectedPackageAmount = meta.amount ?? null;
        state.selectedPackageCurrency = meta.currency || '';
        if (hint) {
          hint.textContent = `Selected: ${packageName}`;
          hint.classList.add('calendar-packages__hint--selected');
        }
        if (typeof clearError === 'function') {
          clearError();
        }
        emitSelection(meta);
        syncSubmitState();
      });
    });

    syncSubmitState();

    return { clearSelection };
  }

  function setupBookingCalendar(root) {
    const form = document.getElementById('calendar-booking-form');
    const grid = root.querySelector('[data-calendar-grid]');
    const monthLabel = root.querySelector('[data-calendar-month]');
    const yearLabel = root.querySelector('[data-calendar-year]');
    const prevBtn = root.querySelector('[data-calendar-prev]');
    const nextBtn = root.querySelector('[data-calendar-next]');
    const timesModal = document.querySelector('[data-times-modal]');
    const timesDialog = timesModal?.querySelector('[data-times-dialog]');
    const timesList = timesModal?.querySelector('[data-calendar-times]');
    const timesHint = timesModal?.querySelector('[data-calendar-hint]');
    const selectedLabel = timesModal?.querySelector('[data-calendar-selected-label]');
    const modalCloseTriggers = timesModal
      ? Array.from(timesModal.querySelectorAll('[data-modal-close]'))
      : [];
    const summaryContainer = form?.querySelector('[data-calendar-summary]');
    const summaryText = form?.querySelector('[data-calendar-summary-text]');
    const changeButton = form?.querySelector('[data-calendar-change]');
    const submitButton = form?.querySelector('[data-calendar-submit]');
    const dateInput = form?.querySelector('#selected-date');
    const timeInput = form?.querySelector('#selected-time');
    const paymentSummaryCard = form?.querySelector('[data-booking-summary]');
    const summaryDateDisplay = paymentSummaryCard?.querySelector('[data-summary-date]');
    const summaryTimeDisplay = paymentSummaryCard?.querySelector('[data-summary-time]');
    const summaryPackageDisplay = paymentSummaryCard?.querySelector('[data-summary-package]');
    const summaryPriceDisplay = paymentSummaryCard?.querySelector('[data-summary-price]');
    const nameInput = form?.querySelector('#customer-name');
    const emailInput = form?.querySelector('#customer-email');
    const phoneInput = form?.querySelector('#customer-phone');
    const customerInputs = [nameInput, emailInput, phoneInput].filter(Boolean);
    let customerFormEnabled = false;

    if (!form || !grid || !monthLabel || !yearLabel || !prevBtn || !nextBtn || !timesModal || !timesDialog || !timesList || !timesHint || !submitButton || !dateInput || !timeInput || !summaryContainer || !summaryText || !changeButton) {
      console.warn('Calendar booking form is missing required elements.');
      return;
    }

    const defaultHint = 'Select a date on the calendar to view available sessions.';
    const availabilityCache = new Map();
    const monthPromises = new Map();
    const dayPromises = new Map();

    let slotMinutesSetting = 5;

    bookingState.submitButton = submitButton;
    bookingState.summaryContainer = summaryContainer;
    bookingState.summaryText = summaryText;
    bookingState.dateInput = dateInput;
    bookingState.timeInput = timeInput;
    bookingState.location = form.dataset.location || bookingState.location;
    bookingState.selectedDate = bookingState.selectedDate || dateInput.value || '';
    bookingState.selectedTime = bookingState.selectedTime || timeInput.value || '';
    syncSubmitState();

    // Add explicit form submit listener (in addition to inline onsubmit)
    form.addEventListener('submit', (event) => {
      console.log('📋 Form submit event listener fired');
      window.handleBooking(event);
    });


    const updateSummaryCard = () => {
      if (!paymentSummaryCard) {
        return;
      }
      if (summaryDateDisplay) {
        summaryDateDisplay.textContent = bookingState.selectedDate
          ? new Date(bookingState.selectedDate).toLocaleDateString('en-AU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
          : '—';
      }
      if (summaryTimeDisplay) {
        summaryTimeDisplay.textContent = bookingState.selectedTime
          ? formatTimeDisplay(bookingState.selectedTime)
          : '—';
      }
      if (summaryPackageDisplay) {
        summaryPackageDisplay.textContent = bookingState.selectedPackageName || '—';
      }
      if (summaryPriceDisplay) {
        summaryPriceDisplay.textContent = bookingState.selectedPackagePrice || 'Shown at checkout';
      }
    };

    const ensureCustomerFormState = () => {
      const readyForDetails = Boolean(
        bookingState.selectedDate &&
        bookingState.selectedTime &&
        bookingState.selectedPackage
      );

      if (!paymentSummaryCard) {
        bookingState.customerName = readyForDetails ? bookingState.customerName : '';
        bookingState.customerEmail = readyForDetails ? bookingState.customerEmail : '';
        bookingState.customerPhone = readyForDetails ? bookingState.customerPhone : '';
        syncSubmitState();
        return;
      }

      if (!readyForDetails) {
        paymentSummaryCard.hidden = true;
        customerInputs.forEach((input) => {
          input.disabled = true;
          if (customerFormEnabled) {
            input.value = '';
          }
        });
        if (customerFormEnabled) {
          bookingState.customerName = '';
          bookingState.customerEmail = '';
          bookingState.customerPhone = '';
        }
        customerFormEnabled = false;
        syncSubmitState();
        return;
      }

      paymentSummaryCard.hidden = false;
      if (!customerFormEnabled) {
        customerInputs.forEach((input) => {
          input.disabled = false;
        });
      }
      customerFormEnabled = true;
      updateSummaryCard();
      syncSubmitState();
    };

    const bindCustomerInput = (input, field) => {
      if (!input) {
        return;
      }
      input.addEventListener('input', (event) => {
        bookingState[field] = event.target.value.trim();
        syncSubmitState();
      });
    };

    bindCustomerInput(nameInput, 'customerName');
    bindCustomerInput(emailInput, 'customerEmail');
    bindCustomerInput(phoneInput, 'customerPhone');

    const packageSelectorHelpers = setupPackageSelector(bookingState, syncSubmitState, clearBookingError, () => {
      updateSummaryCard();
      ensureCustomerFormState();
    });
    if (packageSelectorHelpers) {
      bookingState.clearPackageSelection = packageSelectorHelpers.clearSelection;
    }
    ensureCustomerFormState();
    document.addEventListener('packages:updated', () => {
      updateSummaryCard();
      ensureCustomerFormState();
    });

    timesModal.classList.remove('calendar-times-modal--open');
    timesModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const firstSelectableMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
    const lastSelectableMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 5, 1);

    let viewMonth = new Date(firstSelectableMonth);
    let selectedDate = bookingState.selectedDate || '';
    let selectedTime = bookingState.selectedTime || '';

    let lastFocusedElement = null;

    const formatTimeDisplay = (value) => {
      if (!value) {
        return '';
      }
      const [hourStr, minuteStr] = value.split(':');
      const temp = new Date();
      temp.setHours(Number(hourStr), Number(minuteStr), 0, 0);
      return temp.toLocaleTimeString('en-AU', {
        hour: 'numeric',
        minute: '2-digit'
      });
    };

    const formatIsoDate = (dateObj) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const getSlotsForDate = (dateKey) => availabilityCache.get(dateKey) || [];

    const determineStatus = (slots) => {
      if (!Array.isArray(slots)) {
        return {
          statusText: 'Checking',
          metaText: '',
          stateClass: ''
        };
      }
      if (!slots.length) {
        return {
          statusText: 'Fully booked',
          metaText: 'No sessions available',
          stateClass: 'calendar-day--unavailable'
        };
      }
      if (slots.length <= 3) {
        return {
          statusText: 'Limited',
          metaText: `${slots.length} slot${slots.length === 1 ? '' : 's'} left`,
          stateClass: 'calendar-day--limited'
        };
      }
      return {
        statusText: 'Available',
        metaText: `${slots.length} slot${slots.length === 1 ? '' : 's'} open`,
        stateClass: 'calendar-day--available'
      };
    };

    const openTimesModal = () => {
      if (!timesModal.classList.contains('calendar-times-modal--open')) {
        lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        timesModal.classList.add('calendar-times-modal--open');
        timesModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        window.setTimeout(() => {
          timesDialog.focus({ preventScroll: true });
        }, 0);
      }
    };

    const closeTimesModal = () => {
      if (timesModal.classList.contains('calendar-times-modal--open')) {
        timesModal.classList.remove('calendar-times-modal--open');
        timesModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        if (lastFocusedElement) {
          try {
            lastFocusedElement.focus({ preventScroll: true });
          } catch (err) {
            // ignore focus errors
          }
        }
      }
    };

    modalCloseTriggers.forEach((trigger) => {
      trigger.addEventListener('click', closeTimesModal);
    });

    changeButton.addEventListener('click', (event) => {
      event.preventDefault();
      if (selectedDate) {
        openTimesModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && timesModal.classList.contains('calendar-times-modal--open')) {
        closeTimesModal();
      }
    });

    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

    const normalizeRangeAvailability = (payload) => {
      if (!payload || Array.isArray(payload)) {
        return { days: {}, slotMinutes: undefined, fallback: false };
      }

      if (payload.days && typeof payload.days === 'object' && !Array.isArray(payload.days)) {
        return {
          days: payload.days,
          slotMinutes: payload.slotMinutes,
          fallback: Boolean(payload.fallback)
        };
      }

      const inferredDays = {};
      Object.entries(payload).forEach(([key, value]) => {
        if (isoDatePattern.test(key) && Array.isArray(value)) {
          inferredDays[key] = value;
        }
      });

      return {
        days: inferredDays,
        slotMinutes: payload.slotMinutes,
        fallback: Boolean(payload.fallback)
      };
    };

    const normalizeDayAvailability = (payload) => {
      if (Array.isArray(payload)) {
        return { slots: payload, slotMinutes: undefined, fallback: false };
      }
      if (!payload || typeof payload !== 'object') {
        return { slots: [], slotMinutes: undefined, fallback: false };
      }

      if (Array.isArray(payload.slots)) {
        return {
          slots: payload.slots,
          slotMinutes: payload.slotMinutes,
          fallback: Boolean(payload.fallback)
        };
      }

      return { slots: [], slotMinutes: payload.slotMinutes, fallback: Boolean(payload.fallback) };
    };

    const fetchMonthAvailability = async (monthDate) => {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const cacheKey = `${year}-${month}`;

      if (monthPromises.has(cacheKey)) {
        return monthPromises.get(cacheKey);
      }

      const promise = (async () => {
        const rangeStart = new Date(year, month, 1);
        const rangeEnd = new Date(year, month + 1, 0);
        try {
          const response = await fetch(`/api/availability?start=${formatIsoDate(rangeStart)}&end=${formatIsoDate(rangeEnd)}`, {
            credentials: 'same-origin',
            cache: 'no-store'
          });
          if (!response.ok) {
            throw new Error(await response.text());
          }
          const payload = await response.json();
          const normalized = normalizeRangeAvailability(payload);
          if (typeof normalized.slotMinutes === 'number') {
            slotMinutesSetting = normalized.slotMinutes;
          }
          const { days } = normalized;
          Object.entries(days).forEach(([day, slots]) => {
            availabilityCache.set(day, Array.isArray(slots) ? slots : []);
          });
        } catch (error) {
          console.error('Availability fetch error:', error);
          const cursor = new Date(year, month, 1);
          while (cursor.getMonth() === month) {
            const dateKey = formatIsoDate(cursor);
            if (!availabilityCache.has(dateKey)) {
              availabilityCache.set(dateKey, []);
            }
            cursor.setDate(cursor.getDate() + 1);
          }
        } finally {
          monthPromises.delete(cacheKey);
        }
      })();

      monthPromises.set(cacheKey, promise);
      return promise;
    };

    const ensureDayAvailability = async (dateKey) => {
      if (availabilityCache.has(dateKey)) {
        return availabilityCache.get(dateKey);
      }
      if (dayPromises.has(dateKey)) {
        return dayPromises.get(dateKey);
      }

      const promise = (async () => {
        try {
          const response = await fetch(`/api/availability?date=${dateKey}`, {
            credentials: 'same-origin',
            cache: 'no-store'
          });
          if (!response.ok) {
            throw new Error(await response.text());
          }
          const payload = await response.json();
          const normalized = normalizeDayAvailability(payload);
          if (typeof normalized.slotMinutes === 'number') {
            slotMinutesSetting = normalized.slotMinutes;
          }
          const slots = Array.isArray(normalized.slots) ? normalized.slots : [];
          availabilityCache.set(dateKey, slots);
          return slots;
        } catch (error) {
          console.error('Day availability error:', error);
          availabilityCache.set(dateKey, []);
          throw error;
        } finally {
          dayPromises.delete(dateKey);
        }
      })();

      dayPromises.set(dateKey, promise);
      return promise;
    };

    const renderCalendar = async () => {
      await fetchMonthAvailability(viewMonth);

      grid.innerHTML = '';

      const year = viewMonth.getFullYear();
      const month = viewMonth.getMonth();

      monthLabel.textContent = viewMonth.toLocaleString('en-AU', { month: 'long' });
      yearLabel.textContent = String(year);

      prevBtn.disabled = viewMonth <= firstSelectableMonth;
      nextBtn.disabled = new Date(year, month + 1, 1) > lastSelectableMonth;

      const firstDayIndex = new Date(year, month, 1).getDay();
      const totalDays = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDayIndex; i += 1) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day calendar-day--empty';
        grid.appendChild(emptyCell);
      }

      for (let day = 1; day <= totalDays; day += 1) {
        const currentDate = new Date(year, month, day);
        const dateKey = formatIsoDate(currentDate);

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'calendar-day';
        cell.dataset.date = dateKey;

        const numberSpan = document.createElement('span');
        numberSpan.className = 'calendar-day__number';
        numberSpan.textContent = String(day);

        const statusSpan = document.createElement('span');
        statusSpan.className = 'calendar-day__status';

        const metaSpan = document.createElement('span');
        metaSpan.className = 'calendar-day__meta';

        const slots = getSlotsForDate(dateKey);
        const { statusText, metaText, stateClass } = determineStatus(slots);

        statusSpan.textContent = statusText;
        metaSpan.textContent = metaText;

        if (stateClass) {
          stateClass.split(' ').forEach((cls) => {
            if (cls) {
              cell.classList.add(cls);
            }
          });
        }

        const isPast = currentDate < startOfToday;
        if (isPast) {
          cell.classList.add('calendar-day--past');
          cell.disabled = true;
        } else if (slots.length) {
          cell.addEventListener('click', () => {
            selectDate(dateKey, cell).catch((error) => {
              console.error('Select date error:', error);
            });
          });
        } else {
          cell.classList.add('calendar-day--unavailable');
          cell.disabled = true;
        }

        cell.setAttribute('aria-label', createAriaLabel(currentDate, statusText, slots));

        if (selectedDate === dateKey) {
          cell.classList.add('calendar-day--selected');
        }

        cell.appendChild(numberSpan);
        cell.appendChild(statusSpan);
        if (metaText) {
          cell.appendChild(metaSpan);
        }
        grid.appendChild(cell);
      }
    };

    const selectDate = async (dateKey, cell) => {
      if (cell.classList.contains('calendar-day--unavailable') || cell.classList.contains('calendar-day--past')) {
        return;
      }

      grid.querySelectorAll('.calendar-day--selected').forEach((node) => {
        node.classList.remove('calendar-day--selected');
      });

      selectedDate = dateKey;
      bookingState.selectedDate = dateKey;
      selectedTime = '';
      bookingState.selectedTime = '';
      dateInput.value = dateKey;
      timeInput.value = '';
      syncSubmitState();

      cell.classList.add('calendar-day--selected');

      const activeDate = parseDateKey(dateKey);
      if (summaryContainer.hidden) {
        summaryContainer.hidden = false;
      }
      summaryContainer.dataset.disabled = 'true';
      summaryText.textContent = `${formatLongDate(activeDate)} - select a session time to continue.`;
      clearBookingError();
      updateSummaryCard();
      ensureCustomerFormState();

      await renderTimes(dateKey);
      openTimesModal();
    };

    const renderTimes = async (dateKey = selectedDate) => {
      timesList.innerHTML = '';
      timesHint.textContent = defaultHint;

      if (selectedLabel) {
        selectedLabel.textContent = '';
        selectedLabel.classList.add('hidden');
      }

      if (!dateKey) {
        return;
      }

      try {
        const slots = await ensureDayAvailability(dateKey);
        const activeDate = parseDateKey(dateKey);
        const humanReadable = formatLongDate(activeDate);

        if (selectedLabel) {
          selectedLabel.textContent = slots.length
            ? `Sessions for ${humanReadable}`
            : `No sessions on ${humanReadable}`;
          selectedLabel.classList.remove('hidden');
        }

        if (!slots.length) {
          timesHint.textContent = 'Please choose a different date to view available sessions.';
          updateSummaryCard();
          ensureCustomerFormState();
          return;
        }

        timesHint.textContent = `Choose a session time (${slotMinutesSetting}-minute slots).`;

        slots.forEach((slotValue) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'calendar-times__slot';
          button.dataset.value = slotValue;
          button.textContent = formatTimeDisplay(slotValue);

          button.addEventListener('click', () => {
            timesList.querySelectorAll('.calendar-times__slot--selected').forEach((node) => {
              node.classList.remove('calendar-times__slot--selected');
            });
            button.classList.add('calendar-times__slot--selected');

            selectedTime = slotValue;
            bookingState.selectedTime = slotValue;
            timeInput.value = slotValue;
            syncSubmitState();

            if (summaryContainer.hidden) {
              summaryContainer.hidden = false;
            }
            summaryContainer.dataset.disabled = 'false';
            summaryText.textContent = `${formatLongDate(activeDate)} at ${formatTimeDisplay(slotValue)}`;
            clearBookingError();
            updateSummaryCard();
            ensureCustomerFormState();
          });

          timesList.appendChild(button);
        });

        if (selectedTime && slots.includes(selectedTime)) {
          const targetButton = timesList.querySelector(`[data-value="${selectedTime}"]`);
          if (targetButton) {
            targetButton.classList.add('calendar-times__slot--selected');
          }
        } else {
          selectedTime = '';
          bookingState.selectedTime = '';
          updateSummaryCard();
          ensureCustomerFormState();
        }
        updateSummaryCard();
        ensureCustomerFormState();
      } catch (error) {
        timesHint.textContent = 'Unable to load available sessions right now. Please refresh and try again.';
        showBookingError('We could not load the latest availability. Please try another date.');
        updateSummaryCard();
        ensureCustomerFormState();
      }
    };

    prevBtn.addEventListener('click', async () => {
      if (viewMonth <= firstSelectableMonth) {
        return;
      }
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
      try {
        await renderCalendar();
      } catch (error) {
        console.error('Calendar render error:', error);
      }
    });

    nextBtn.addEventListener('click', async () => {
      const testMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
      if (testMonth > lastSelectableMonth) {
        return;
      }
      viewMonth = testMonth;
      try {
        await renderCalendar();
      } catch (error) {
        console.error('Calendar render error:', error);
      }
    });

    form.addEventListener('reset', () => {
      window.setTimeout(() => {
        selectedDate = '';
        selectedTime = '';
        bookingState.selectedDate = '';
        bookingState.selectedTime = '';
        dateInput.value = '';
        timeInput.value = '';
        if (typeof bookingState.clearPackageSelection === 'function') {
          bookingState.clearPackageSelection();
        }
        grid.querySelectorAll('.calendar-day--selected').forEach((node) => node.classList.remove('calendar-day--selected'));
        summaryContainer.hidden = true;
        summaryContainer.dataset.disabled = 'true';
        summaryText.textContent = 'Please pick a date and time to continue.';
        renderTimes('').catch(() => { });
        updateSummaryCard();
        ensureCustomerFormState();
        syncSubmitState();
      }, 0);
    });

    renderCalendar()
      .then(() => renderTimes('').catch(() => { }))
      .catch((error) => {
        console.error('Initial calendar render error:', error);
      });
    updateSummaryCard();
    ensureCustomerFormState();

    function createAriaLabel(date, statusText, slots) {
      const base = formatLongDate(date);
      if (!Array.isArray(slots) || !slots.length) {
        return `${base}, ${statusText || 'no sessions available'}`;
      }
      return `${base}, ${slots.length} session${slots.length === 1 ? '' : 's'} available`;
    }

    function parseDateKey(key) {
      const [year, month, day] = key.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    function formatLongDate(date) {
      return date.toLocaleDateString('en-AU', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
});



