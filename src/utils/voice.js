/**
 * NatureGuard — Voice Utility
 * Handles Web Speech API for voice-to-text inputs across the app.
 */

export function setupVoiceInput(btn, textarea, statusEl, defaultStatusText) {
  if (!btn) return;

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    btn.title = 'Voice input not supported in this browser';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;     // One utterance at a time, then auto-restart
  recognition.interimResults = true;  // Live partial results while speaking
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  let isListening = false;
  let committedText = '';  // Text confirmed so far (not interim)

  const setListeningUI = (listening) => {
    isListening = listening;
    if (listening) {
      btn.style.background = 'rgba(239, 68, 68, 0.2)';
      btn.style.borderColor = '#EF4444';
      btn.style.boxShadow = '0 0 0 4px rgba(239,68,68,0.15), 0 0 16px rgba(239,68,68,0.2)';
      btn.style.animation = 'pulseGlow 1.2s ease-in-out infinite';
      btn.textContent = '⏹️';
      btn.title = 'Click to stop';
      btn.setAttribute('aria-label', 'Stop voice input');
      if (statusEl) {
        statusEl.style.color = '#EF4444';
        statusEl.textContent = '🎙️ Listening... speak now';
      }
    } else {
      btn.style.background = 'var(--glass-bg)';
      btn.style.borderColor = 'var(--border-default)';
      btn.style.boxShadow = '';
      btn.style.animation = '';
      btn.textContent = '🎙️';
      btn.title = 'Speak your activity';
      btn.setAttribute('aria-label', 'Start voice input');
      if (statusEl) {
        statusEl.style.color = 'var(--text-muted)';
        statusEl.textContent = defaultStatusText;
      }
    }
  };

  const startRecognition = () => {
    try { recognition.start(); } catch(e) { /* already started */ }
  };

  recognition.onstart = () => {
    // Sync committedText to whatever's already in the textarea when recording starts
    committedText = textarea.value;
  };

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += t;
      } else {
        interim += t;
      }
    }

    console.log('[Voice Debug] onresult fired. Interim:', interim, '| Final:', final);

    if (final) {
      // Append confirmed text with a space separator
      const separator = committedText && !committedText.endsWith(' ') ? ' ' : '';
      committedText = committedText + separator + final.trim();
      textarea.value = committedText;
      if (statusEl) statusEl.textContent = `🎙️ "${final.trim()}"`;
    } else if (interim) {
      // Show live preview in the textarea (not committed yet)
      const separator = committedText && !committedText.endsWith(' ') ? ' ' : '';
      textarea.value = committedText + separator + interim;
      if (statusEl) statusEl.textContent = `🎙️ Hearing: "${interim.trim()}"`;
    }
  };

  recognition.onerror = (event) => {
    console.warn('[Voice Debug] onerror fired:', event.error);
    // no-speech: user didn't say anything during this session window — just restart silently
    if (event.error === 'no-speech') {
      if (statusEl) statusEl.textContent = '🎙️ Listening... speak now';
      return; // onend will auto-restart
    }
    // aborted: we stopped it manually — ignore
    if (event.error === 'aborted') return;

    // Fatal errors: stop completely
    setListeningUI(false);
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      import('../utils/toast.js').then(({ toastError }) => {
        toastError('Microphone access denied. Please allow mic access in browser settings.');
      });
    } else if (event.error === 'audio-capture') {
      import('../utils/toast.js').then(({ toastError }) => {
        toastError('No microphone found. Please connect a microphone and try again.');
      });
    } else {
      import('../utils/toast.js').then(({ toastError }) => {
        toastError(`Voice error: ${event.error}. Please try again.`);
      });
    }
  };

  recognition.onend = () => {
    console.log('[Voice Debug] onend fired. isListening =', isListening);
    if (isListening) {
      // Auto-restart to keep listening continuously
      setTimeout(startRecognition, 100);
    }
  };

  btn.addEventListener('click', () => {
    if (isListening) {
      setListeningUI(false);
      recognition.stop();
      import('../utils/toast.js').then(({ toastInfo }) => {
        toastInfo('Voice input stopped. Processing final words...');
      });
    } else {
      committedText = textarea.value; // start from existing textarea content
      setListeningUI(true);
      startRecognition();
      import('../utils/toast.js').then(({ toastSuccess }) => {
        toastSuccess('🎙️ Voice input started — speak freely!');
      });
    }
  });
}
