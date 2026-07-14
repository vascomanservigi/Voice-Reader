(function() {
    'use strict';

    const state = {
        isMenuOpen: false,
        services: [],
        hours: [],
        selectedService: null,
        selectedDate: null,
        selectedTime: null
    };

    const elements = {
        header: document.querySelector('.header'),
        navMenu: document.querySelector('.nav-menu'),
        navToggle: document.querySelector('.nav-toggle'),
        navLinks: document.querySelectorAll('.nav-link'),
        scrollTop: document.querySelector('.scroll-top'),
        bookingForm: document.querySelector('#booking-form'),
        toast: document.querySelector('#toast'),
        servizioSelect: document.querySelector('#servizio'),
        dataInput: document.querySelector('#data'),
        oraSelect: document.querySelector('#ora')
    };

    function init() {
        loadServices();
        loadHours();
        setupEventListeners();
        setupScrollEffects();
        setupIntersectionObserver();
        setMinDate();
    }

    async function loadServices() {
        try {
            const res = await fetch('/api/servizi');
            const data = await res.json();
            state.services = data.servizi;
            populateServiceSelect(data.servizi);
        } catch (e) {
            console.error('Errore caricamento servizi:', e);
        }
    }

    async function loadHours() {
        try {
            const res = await fetch('/api/orari');
            const data = await res.json();
            state.hours = data.orari;
        } catch (e) {
            console.error('Errore caricamento orari:', e);
        }
    }

    function populateServiceSelect(servizi) {
        const select = elements.servizioSelect;
        if (!select) return;
        
        servizi.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = `${s.nome} - ${s.prezzo} (${s.durata})`;
            option.dataset.prezzo = s.prezzo;
            option.dataset.durata = s.durata;
            select.appendChild(option);
        });
    }

    function setMinDate() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        if (elements.dataInput) {
            elements.dataInput.min = minDate;
            elements.dataInput.value = minDate;
            updateTimeSlots(minDate);
        }
    }

    function updateTimeSlots(dateStr) {
        const select = elements.oraSelect;
        if (!select) return;
        
        select.innerHTML = '';
        select.disabled = false;
        
        const date = new Date(dateStr + 'T00:00:00');
        const dayName = date.toLocaleDateString('it-IT', { weekday: 'long' });
        
        const daySchedule = state.hours.find(h => h.giorno.toLowerCase().includes(dayName.toLowerCase()));
        
        if (!daySchedule || daySchedule.mattina === 'Chiuso' && daySchedule.pomeriggio === 'Chiuso') {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Chiuso in questo giorno';
            option.disabled = true;
            select.appendChild(option);
            select.disabled = true;
            return;
        }

        const slots = [];
        
        if (daySchedule.mattina !== 'Chiuso') {
            const [startM, endM] = daySchedule.mattina.split(' - ');
            slots.push(...generateSlots(startM, endM));
        }
        
        if (daySchedule.pomeriggio !== 'Chiuso') {
            const [startP, endP] = daySchedule.pomeriggio.split(' - ');
            slots.push(...generateSlots(startP, endP));
        }

        if (slots.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nessuno slot disponibile';
            option.disabled = true;
            select.appendChild(option);
            select.disabled = true;
            return;
        }

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Seleziona un orario';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        slots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            select.appendChild(option);
        });
    }

    function generateSlots(start, end) {
        const slots = [];
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        
        let current = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        
        while (current + 30 <= endMinutes) {
            const h = Math.floor(current / 60).toString().padStart(2, '0');
            const m = (current % 60).toString().padStart(2, '0');
            slots.push(`${h}:${m}`);
            current += 30;
        }
        
        return slots;
    }

    function setupEventListeners() {
        if (elements.navToggle) {
            elements.navToggle.addEventListener('click', toggleMenu);
        }

        elements.navLinks.forEach(link => {
            link.addEventListener('click', () => closeMenu());
        });

        document.addEventListener('click', (e) => {
            if (state.isMenuOpen && !elements.navMenu.contains(e.target) && !elements.navToggle.contains(e.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isMenuOpen) closeMenu();
        });

        if (elements.dataInput) {
            elements.dataInput.addEventListener('change', (e) => {
                state.selectedDate = e.target.value;
                updateTimeSlots(e.target.value);
            });
        }

        if (elements.oraSelect) {
            elements.oraSelect.addEventListener('change', (e) => {
                state.selectedTime = e.target.value;
            });
        }

        if (elements.servizioSelect) {
            elements.servizioSelect.addEventListener('change', (e) => {
                state.selectedService = e.target.value;
            });
        }

        if (elements.bookingForm) {
            elements.bookingForm.addEventListener('submit', handleBookingSubmit);
        }

        if (elements.scrollTop) {
            elements.scrollTop.addEventListener('click', scrollToTop);
        }

        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('blur', () => validateField(input));
                input.addEventListener('input', () => clearError(input));
            });
        });
    }

    function toggleMenu() {
        state.isMenuOpen = !state.isMenuOpen;
        elements.navMenu.classList.toggle('open', state.isMenuOpen);
        elements.navToggle.setAttribute('aria-expanded', state.isMenuOpen);
        document.body.style.overflow = state.isMenuOpen ? 'hidden' : '';
    }

    function closeMenu() {
        state.isMenuOpen = false;
        elements.navMenu.classList.remove('open');
        elements.navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    function setupScrollEffects() {
        let lastScroll = 0;
        const scrollThreshold = 100;

        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            
            if (elements.header) {
                elements.header.classList.toggle('scrolled', currentScroll > 20);
            }

            if (elements.scrollTop) {
                elements.scrollTop.classList.toggle('visible', currentScroll > scrollThreshold);
            }

            lastScroll = currentScroll;
        }, { passive: true });
    }

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        document.querySelectorAll('.service-card, .team-card, .tech-card, .about-values li, .contact-details li').forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
            observer.observe(el);
        });
    }

    function validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        if (field.hasAttribute('required') && !value) {
            isValid = false;
            message = 'Questo campo è obbligatorio';
        } else if (field.type === 'email' && value && !isValidEmail(value)) {
            isValid = false;
            message = 'Inserisci un\'email valida';
        } else if (field.type === 'tel' && value && !isValidPhone(value)) {
            isValid = false;
            message = 'Inserisci un numero di telefono valido';
        } else if (field.type === 'date' && value && !isFutureDate(value)) {
            isValid = false;
            message = 'La data deve essere futura';
        }

        if (!isValid) {
            showError(field, message);
        } else {
            clearError(field);
        }

        return isValid;
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/.test(phone);
    }

    function isFutureDate(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inputDate = new Date(dateStr + 'T00:00:00');
        return inputDate >= today;
    }

    function showError(field, message) {
        field.classList.add('error');
        let errorEl = field.parentNode.querySelector('.error-message');
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'error-message';
            errorEl.style.cssText = 'display:block; color:#c62828; font-size:0.8125rem; margin-top:0.375rem;';
            field.parentNode.appendChild(errorEl);
        }
        errorEl.textContent = message;
    }

    function clearError(field) {
        field.classList.remove('error');
        const errorEl = field.parentNode.querySelector('.error-message');
        if (errorEl) errorEl.remove();
    }

    async function handleBookingSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!validateField(input)) isValid = false;
        });

        const privacyCheckbox = form.querySelector('input[name="privacy"]');
        if (privacyCheckbox && !privacyCheckbox.checked) {
            showError(privacyCheckbox, 'Devi accettare l\'informativa privacy');
            isValid = false;
        }

        if (!isValid) {
            showToast('Compila tutti i campi obbligatori correttamente', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Invio...';

        const formData = {
            nome: form.nome.value.trim(),
            email: form.email.value.trim(),
            telefono: form.telefono.value.trim(),
            servizio: form.servizio.value,
            data: form.data.value,
            ora: form.ora.value,
            note: form.note.value.trim()
        };

        try {
            const res = await fetch('/api/prenotazione', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                showToast(data.message, 'success');
                form.reset();
                state.selectedService = null;
                state.selectedDate = null;
                state.selectedTime = null;
                if (elements.oraSelect) {
                    elements.oraSelect.innerHTML = '<option value="" disabled selected>Seleziona prima la data</option>';
                    elements.oraSelect.disabled = true;
                }
                setMinDate();
            } else {
                showToast(data.message || 'Errore durante la prenotazione', 'error');
            }
        } catch (err) {
            console.error('Errore prenotazione:', err);
            showToast('Errore di connessione. Riprova più tardi.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    function showToast(message, type = 'success') {
        const toast = elements.toast;
        if (!toast) return;

        const messageEl = toast.querySelector('.toast-message');
        const iconEl = toast.querySelector('.toast-icon');
        
        if (messageEl) messageEl.textContent = message;
        
        toast.className = 'toast ' + type;
        toast.hidden = false;

        setTimeout(() => {
            toast.hidden = true;
        }, 5000);
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        loadServices();
        loadHours();
        setupEventListeners();
        setupScrollEffects();
        setupIntersectionObserver();
        setMinDate();
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { init };
    } else {
        init();
    }
})();