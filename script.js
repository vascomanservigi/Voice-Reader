const textInput = document.getElementById('text-input');
const voiceSelect = document.getElementById('voice-select');
const rateInput = document.getElementById('rate');
const pitchInput = document.getElementById('pitch');
const volumeInput = document.getElementById('volume');
const rateValue = document.getElementById('rate-value');
const pitchValue = document.getElementById('pitch-value');
const volumeValue = document.getElementById('volume-value');
const speakBtn = document.getElementById('speak-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const status = document.getElementById('status');

let voices = [];
let utterance = null;

function loadVoices() {
    voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    
    voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (voice.default) option.selected = true;
        voiceSelect.appendChild(option);
    });
}

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

rateInput.addEventListener('input', () => {
    rateValue.textContent = `${rateInput.value}x`;
});

pitchInput.addEventListener('input', () => {
    pitchValue.textContent = `${pitchInput.value}x`;
});

volumeInput.addEventListener('input', () => {
    volumeValue.textContent = `${Math.round(volumeInput.value * 100)}%`;
});

function updateStatus(text, className = '') {
    status.textContent = text;
    status.className = 'status ' + className;
}

function speak() {
    if (speechSynthesis.speaking && speechSynthesis.paused) {
        speechSynthesis.resume();
        updateStatus('In lettura...', 'speaking');
        speakBtn.disabled = true;
        pauseBtn.disabled = false;
        return;
    }

    const text = textInput.value.trim();
    if (!text) {
        alert('Inserisci del testo da leggere');
        return;
    }

    utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices[voiceSelect.value];
    utterance.rate = parseFloat(rateInput.value);
    utterance.pitch = parseFloat(pitchInput.value);
    utterance.volume = parseFloat(volumeInput.value);

    utterance.onstart = () => {
        updateStatus('In lettura...', 'speaking');
        speakBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
    };

    utterance.onpause = () => {
        updateStatus('In pausa', 'paused');
        speakBtn.disabled = false;
        pauseBtn.disabled = true;
    };

    utterance.onend = () => {
        updateStatus('Completato');
        speakBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
    };

    utterance.onerror = (e) => {
        updateStatus('Errore: ' + e.error);
        speakBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
    };

    speechSynthesis.speak(utterance);
}

function pause() {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
    }
}

function stop() {
    speechSynthesis.cancel();
    updateStatus('Interrotto');
    speakBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
}

speakBtn.addEventListener('click', speak);
pauseBtn.addEventListener('click', pause);
stopBtn.addEventListener('click', stop);

textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        speak();
    }
});

speechSynthesis.onvoiceschanged = loadVoices;