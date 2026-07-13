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
const downloadBtn = document.getElementById('download-btn');
const status = document.getElementById('status');

let voices = [];
let italianVoices = [];
let utterance = null;
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let audioDestination = null;

const HIGH_QUALITY_VOICES = [
    'Google Italiano',
    'Google Italian',
    'Alice',
    'Luca',
    'Alice (Enhanced)',
    'Luca (Enhanced)',
    'Microsoft Elsa',
    'Microsoft Cosimo',
    'Samantha',
    'Vittoria',
    'Chiara',
    'Federica',
    'Giorgio',
    'Paolo',
    'Silvia',
    'Elsa',
    'Cosimo'
];

function isHighQualityVoice(voice) {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    
    if (!lang.startsWith('it')) return false;
    
    return HIGH_QUALITY_VOICES.some(hq => 
        name.includes(hq.toLowerCase())
    ) || voice.localService === false;
}

function loadVoices() {
    voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    
    italianVoices = voices.filter(v => v.lang.startsWith('it'));
    
    const highQuality = italianVoices.filter(isHighQualityVoice);
    const standard = italianVoices.filter(v => !isHighQualityVoice(v));
    
    const sortedVoices = [...highQuality, ...standard];
    
    if (sortedVoices.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Nessuna voce italiana disponibile';
        option.disabled = true;
        voiceSelect.appendChild(option);
        speakBtn.disabled = true;
        downloadBtn.disabled = true;
        return;
    }
    
    sortedVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = voices.indexOf(voice);
        const qualityBadge = highQuality.includes(voice) ? ' ⭐' : '';
        option.textContent = `${voice.name} (${voice.lang})${qualityBadge}`;
        if (voice.default || index === 0) option.selected = true;
        voiceSelect.appendChild(option);
    });
    
    speakBtn.disabled = false;
    downloadBtn.disabled = false;
}

const highQuality = italianVoices.filter(isHighQualityVoice);

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

async function setupAudioRecording() {
    try {
        audioContext = new AudioContext();
        audioDestination = audioContext.createMediaStreamDestination();
        const stream = audioDestination.stream;
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        
        mediaRecorder.start(100);
        return audioDestination;
    } catch (err) {
        console.error('MediaRecorder setup failed:', err);
        return null;
    }
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

    if (italianVoices.length === 0) {
        alert('Nessuna voce italiana disponibile in questo browser');
        return;
    }

    utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices[voiceSelect.value];
    utterance.rate = parseFloat(rateInput.value);
    utterance.pitch = parseFloat(pitchInput.value);
    utterance.volume = parseFloat(volumeInput.value);
    utterance.lang = 'it-IT';

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

async function downloadMP3() {
    const text = textInput.value.trim();
    if (!text) {
        alert('Inserisci del testo da scaricare');
        return;
    }
    
    if (italianVoices.length === 0) {
        alert('Nessuna voce italiana disponibile');
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = '⏳ Registrazione...';
    updateStatus('Registrazione audio in corso...', 'speaking');

    const destination = await setupAudioRecording();
    if (!destination) {
        alert('Registrazione audio non supportata in questo browser');
        downloadBtn.disabled = false;
        downloadBtn.textContent = '⬇ Scarica MP3';
        updateStatus('Errore registrazione');
        return;
    }

    const selectedVoice = voices[voiceSelect.value];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.rate = parseFloat(rateInput.value);
    utterance.pitch = parseFloat(pitchInput.value);
    utterance.volume = parseFloat(volumeInput.value);
    utterance.lang = 'it-IT';

    const audioSource = audioContext.createMediaElementSource(new Audio());
    audioSource.connect(audioDestination);
    audioSource.connect(audioContext.destination);

    utterance.onstart = () => {
        speechSynthesis.speak(utterance);
    };

    utterance.onend = async () => {
        mediaRecorder.stop();
        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            await convertAndDownload(blob, text);
        };
    };

    utterance.onerror = (e) => {
        mediaRecorder.stop();
        updateStatus('Errore: ' + e.error);
        downloadBtn.disabled = false;
        downloadBtn.textContent = '⬇ Scarica MP3';
    };
}

async function convertAndDownload(webmBlob, text) {
    try {
        updateStatus('Conversione in MP3...', 'speaking');
        
        const arrayBuffer = await webmBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const mp3Blob = await encodeMP3(audioBuffer);
        
        const url = URL.createObjectURL(mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = text.substring(0, 30).replace(/[^a-z0-9]/gi, '_') + '.mp3';
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        
        updateStatus('MP3 scaricato!');
        downloadBtn.disabled = false;
        downloadBtn.textContent = '⬇ Scarica MP3';
    } catch (err) {
        console.error('MP3 conversion error:', err);
        alert('Errore conversione MP3. Scarico come .webm...');
        downloadFallback(webmBlob, text);
    }
}

function downloadFallback(blob, text) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = text.substring(0, 30).replace(/[^a-z0-9]/gi, '_') + '.webm';
    a.click();
    URL.revokeObjectURL(url);
    downloadBtn.disabled = false;
    downloadBtn.textContent = '⬇ Scarica MP3';
    updateStatus('Scaricato come .webm');
}

async function encodeMP3(audioBuffer) {
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    
    const samples = new Float32Array(length * numChannels);
    for (let ch = 0; ch < numChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            samples[i * numChannels + ch] = channelData[i];
        }
    }
    
    const mp3Encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
    const blockSize = 1152;
    const mp3Data = [];
    
    for (let i = 0; i < samples.length; i += blockSize * numChannels) {
        const block = samples.subarray(i, i + blockSize * numChannels);
        if (block.length < blockSize * numChannels) break;
        
        const left = block.filter((_, idx) => idx % numChannels === 0);
        const right = numChannels > 1 ? block.filter((_, idx) => idx % numChannels === 1) : left;
        
        const mp3buf = mp3Encoder.encodeBuffer(left, right);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
    
    const finalBuf = mp3Encoder.flush();
    if (finalBuf.length > 0) mp3Data.push(finalBuf);
    
    const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
    return mp3Blob;
}

function pause() {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
    }
}

function stop() {
    speechSynthesis.cancel();
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
    updateStatus('Interrotto');
    speakBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    downloadBtn.disabled = false;
    downloadBtn.textContent = '⬇ Scarica MP3';
}

speakBtn.addEventListener('click', speak);
pauseBtn.addEventListener('click', pause);
stopBtn.addEventListener('click', stop);
downloadBtn.addEventListener('click', downloadMP3);

textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        speak();
    }
});

speechSynthesis.onvoiceschanged = loadVoices;