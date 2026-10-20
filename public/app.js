const socket = io();

// Elementos DOM
const ttUsernameInput = document.getElementById('ttUsernameInput');
const btnConnectTT = document.getElementById('btnConnectTT');
const ttStatusDot = document.getElementById('ttStatusDot');
const ttStatusText = document.getElementById('ttStatusText');

const ytUrlInput = document.getElementById('ytUrlInput');
const btnConnectYT = document.getElementById('btnConnectYT');
const ytStatusDot = document.getElementById('ytStatusDot');
const ytStatusText = document.getElementById('ytStatusText');

const simStatusDot = document.getElementById('simStatusDot');
const btnSimulateOne = document.getElementById('btnSimulateOne');
const btnToggleSimLoop = document.getElementById('btnToggleSimLoop');

const chatFeed = document.getElementById('chatFeed');
const emptyFeedNotice = document.getElementById('emptyFeedNotice');
const chkAutoScroll = document.getElementById('chkAutoScroll');
const btnClearFeed = document.getElementById('btnClearFeed');
const txtSearchChat = document.getElementById('txtSearchChat');

const statTotalMsgs = document.getElementById('statTotalMsgs');
const statTotalReplies = document.getElementById('statTotalReplies');

const aiIntelligenceCard = document.getElementById('aiIntelligenceCard');
const aiOrbVisual = document.getElementById('aiOrbVisual');
const displayBotName = document.getElementById('displayBotName');
const aiStateLabel = document.getElementById('aiStateLabel');
const chkAutoPilot = document.getElementById('chkAutoPilot');
const rngCooldown = document.getElementById('rngCooldown');
const cooldownLabel = document.getElementById('cooldownLabel');

const rngVolume = document.getElementById('rngVolume');
const btnMuteAudio = document.getElementById('btnMuteAudio');
const btnTestVoice = document.getElementById('btnTestVoice');
const replyHistory = document.getElementById('replyHistory');

// Apple Sheet Modal Elements
const settingsModal = document.getElementById('settingsModal');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const cfgBotName = document.getElementById('cfgBotName');
const cfgVoiceLang = document.getElementById('cfgVoiceLang');
const cfgVoiceSelect = document.getElementById('cfgVoiceSelect');
const btnPreviewVoice = document.getElementById('btnPreviewVoice');
const cfgProvider = document.getElementById('cfgProvider');
const cfgApiKey = document.getElementById('cfgApiKey');
const cfgPrompt = document.getElementById('cfgPrompt');

const smolLMProgressContainer = document.getElementById('smolLMProgressContainer');
const smolLMStatusText = document.getElementById('smolLMStatusText');
const smolLMProgressBar = document.getElementById('smolLMProgressBar');

// Estado Local
let totalMessages = 0;
let totalReplies = 0;
let isAudioMuted = false;
let audioVolume = 1.0;
let speechQueue = [];
let isSpeaking = false;
let isSimLoopRunning = false;
let currentSearchQuery = '';

let currentAIProvider = 'fallback';
let smolLMGenerator = null;
let isSmolLMLoading = false;

let selectedVoiceName = localStorage.getItem('streamai_voice_name') || '';
let selectedVoiceLang = localStorage.getItem('streamai_voice_lang') || 'es';

// Motor en Navegador: SmolLM2 (~90MB) servido 100% en local desde el proyecto
async function ensureSmolLMLoaded() {
  if (smolLMGenerator) return smolLMGenerator;
  if (isSmolLMLoading) return null;
  isSmolLMLoading = true;

  if (smolLMProgressContainer) {
    smolLMProgressContainer.style.display = 'block';
    smolLMStatusText.textContent = 'Cargando modelo local...';
    smolLMProgressBar.style.width = '15%';
  }

  try {
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3');

    // Configurar Transformers.js para cargar del servidor local
    env.allowLocalModels = true;
    env.allowRemoteModels = true;
    env.localModelPath = '/models/';

    if (smolLMStatusText) smolLMStatusText.textContent = 'Inicializando WebGPU...';
    if (smolLMProgressBar) smolLMProgressBar.style.width = '35%';

    smolLMGenerator = await pipeline('text-generation', 'smollm2', {
      dtype: 'q4',
      device: 'webgpu',
      progress_callback: (p) => {
        if (p.status === 'progress' && p.total) {
          const pct = Math.round((p.loaded / p.total) * 100);
          if (smolLMStatusText) smolLMStatusText.textContent = `Cargando local: ${pct}%`;
          if (smolLMProgressBar) smolLMProgressBar.style.width = `${pct}%`;
        }
      }
    });

    if (smolLMStatusText) smolLMStatusText.textContent = 'Listo en WebGPU (Local)';
    if (smolLMProgressBar) smolLMProgressBar.style.width = '100%';
    setTimeout(() => {
      if (smolLMProgressContainer) smolLMProgressContainer.style.display = 'none';
    }, 2500);

    isSmolLMLoading = false;
    return smolLMGenerator;
  } catch (err) {
    console.warn('WebGPU no disponible o fallo con q4, probando WASM (CPU) local:', err);
    try {
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3');
      env.allowLocalModels = true;
      env.allowRemoteModels = true;
      env.localModelPath = '/models/';

      smolLMGenerator = await pipeline('text-generation', 'smollm2', {
        dtype: 'q4',
        device: 'wasm'
      });
      if (smolLMStatusText) smolLMStatusText.textContent = 'Listo en CPU (Local)';
      if (smolLMProgressBar) smolLMProgressBar.style.width = '100%';
      setTimeout(() => {
        if (smolLMProgressContainer) smolLMProgressContainer.style.display = 'none';
      }, 2500);
      isSmolLMLoading = false;
      return smolLMGenerator;
    } catch (wasmErr) {
      console.error('Error al cargar SmolLM2 local:', wasmErr);
      if (smolLMStatusText) smolLMStatusText.textContent = 'Fallo de carga';
      isSmolLMLoading = false;
      return null;
    }
  }
}

// ============================================================================
// Patrón Template Method & Validator (GoF #3.10): Validación Estricta de Coherencia
// ============================================================================

function isResponseCoherent(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (clean.length < 4 || clean.length > 280) return false;

  // 1. Detectar degeneración cíclica o repeticiones ("1.1.1.1...", ".....", "aaaa")
  if (/^(\d+[\.\,\s\-]+){3,}/.test(clean)) return false;
  if (/(.)\1{4,}/.test(clean)) return false;

  // 2. Detectar alta densidad de símbolos de código o no alfanuméricos (ej: 0-12 #849563 (n/o) / _| **<==)
  const symbols = (clean.match(/[\#\*\<\>\=\|\_\/\\\{\}\[\]\^\@\$\%\~]/g) || []).length;
  if (symbols > 2) return false;

  // 3. Detectar pseudo-latín o alucinaciones de tokens rotos conocidos de modelos en inglés
  const gibberishRegex = /\b(respnatio|paxunus|izwcuglj|fuuturar|nazeloj|salubrious|suiccinida|nãoseul|respellar|estrao|adminuating|eynon|iyeri|convalución)\b/i;
  if (gibberishRegex.test(clean)) return false;

  // 4. Debe contener al menos 2 palabras reales con vocales
  const words = clean.split(/\s+/).filter(w => /[aeiouáéíóú]/i.test(w));
  if (words.length < 2) return false;

  return true;
}

// ============================================================================
// Patrón Chain of Responsibility (GoF #3.1): Cadena de Manejadores de Respuesta
// ============================================================================

class FastSemanticHandler {
  static handle(author, message) {
    const cleanMsg = (message || '').toLowerCase();

    // 1. Saludos dedicados y familiares (primo, amigo, gente)
    if (cleanMsg.includes('saludo') || cleanMsg.includes('primo') || cleanMsg.includes('amigo') || cleanMsg.includes('hola') || cleanMsg.includes('buenas')) {
      const match = cleanMsg.match(/para\s+(?:mi\s+)?([a-záéíóúñ]+)/i);
      const recipient = match ? match[1] : author;
      return `¡Un saludazo enorme con todo el cariño del stream para ${recipient}! Gracias por estar aquí compartiendo el directo con nosotros.`;
    }

    // 2. Tiempo de transmisión o duración del directo
    if (cleanMsg.includes('tiempo') || cleanMsg.includes('llevas') || cleanMsg.includes('cuanto tiempo') || cleanMsg.includes('horas')) {
      return `¡Hola ${author}! Llevamos un buen rato a tope y con toda la energía, y la noche apenas está comenzando.`;
    }

    // 3. Likes, apoyo y llamados a la comunidad
    if (cleanMsg.includes('me gusta') || cleanMsg.includes('like') || cleanMsg.includes('apoyen') || cleanMsg.includes('compartan')) {
      return `¡Eso mismo ${author}! Revienten ese botón de me gusta y compartan el directo, que la comunidad es lo mejor que tenemos.`;
    }

    // 4. Preguntas de juego, partidas o torneos
    if (cleanMsg.includes('partida') || cleanMsg.includes('juego') || cleanMsg.includes('juegas') || cleanMsg.includes('ronda') || cleanMsg.includes('siguiente')) {
      return `¡Buena pregunta ${author}! Ya casi arranca la siguiente partida, no te despegues que se viene épica.`;
    }

    // 5. Opiniones de actualizaciones, parches y cambios
    if (cleanMsg.includes('actualizacion') || cleanMsg.includes('actualización') || cleanMsg.includes('parche') || cleanMsg.includes('opinas') || cleanMsg.includes('nuevo') || cleanMsg.includes('ayer')) {
      return `En mi opinión ${author}, la nueva actualización está tremenda. Mejoró varias mecánicas y está súper entretenida.`;
    }

    // 6. Personajes favoritos y estilo de juego
    if (cleanMsg.includes('personaje') || cleanMsg.includes('favorito') || cleanMsg.includes('campeon') || cleanMsg.includes('hero')) {
      return `Gran pregunta ${author}. Definitivamente me quedo con los personajes más rápidos y agresivos en la arena.`;
    }

    // 7. Discord y redes sociales
    if (cleanMsg.includes('discord') || cleanMsg.includes('comunidad') || cleanMsg.includes('redes') || cleanMsg.includes('grupo')) {
      return `¡Claro que sí ${author}! Puedes encontrar el enlace del Discord oficial y todas las redes fijados en la descripción del canal.`;
    }

    // 8. Regalos, flores, gorras y donaciones
    if (cleanMsg.includes('regalo') || cleanMsg.includes('rosa') || cleanMsg.includes('corazon') || cleanMsg.includes('gorra') || cleanMsg.includes('donacion') || cleanMsg.includes('super chat')) {
      return `¡Muchísimas gracias por ese regalo y apoyo tremendo, ${author}! Haces que este canal siga creciendo cada día más.`;
    }

    // 9. Música y ambiente
    if (cleanMsg.includes('musica') || cleanMsg.includes('música') || cleanMsg.includes('cancion') || cleanMsg.includes('canción') || cleanMsg.includes('playlist')) {
      return `¡Qué bien que te guste la música ${author}! Siempre buscamos la mejor selección para que disfruten la vibra del directo.`;
    }

    // 10. Preguntas generales
    if (cleanMsg.includes('?') || cleanMsg.includes('¿')) {
      const qReplies = [
        `¡Buena pregunta ${author}! Justo estábamos comentando eso hace un momento en el stream.`,
        `Ojo con lo que pregunta ${author}, sin duda es algo clave para la estrategia de hoy.`,
        `¡Gran detalle ${author}! Me parece que la clave está en mantener la calma y jugar en equipo.`
      ];
      return qReplies[Math.floor(Math.random() * qReplies.length)];
    }

    return null; // Pasa al siguiente eslabón si no hay match directo
  }
}

class IntelligentCoHostFallbackHandler {
  static handle(author, message) {
    const defaultReplies = [
      `¡Totalmente de acuerdo contigo, ${author}! Es un puntazo lo que acabas de mencionar.`,
      `Me encanta tu energía en el chat, ${author}. ¡Gracias por acompañarnos en el directo!`,
      `¡Qué crack eres ${author}! Saludos especiales para ti en esta transmisión.`,
      `Ojo a lo que dice ${author}, tiene toda la razón del mundo.`
    ];
    return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
  }
}

// Inferencia SmolLM2 con Guardián de Timeout (Máximo 2.0 segundos para no bloquear)
async function generateWithSmolLMWithTimeout(generator, author, message, timeoutMs = 2000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT_SMOLLM_CPU')), timeoutMs);
  });

  const generatePromise = (async () => {
    const userPersona = cfgPrompt && cfgPrompt.value.trim()
      ? cfgPrompt.value.trim().replace(/\b\d+\b/g, '')
      : 'Eres Aura, copiloto divertida y amigable del stream.';

    const messages = [
      { role: 'system', content: `${userPersona} Responde brevemente en una frase coloquial en español.` },
      { role: 'user', content: `${author}: ${message}` }
    ];

    const out = await generator(messages, {
      max_new_tokens: 30,
      temperature: 0.5,
      top_k: 30,
      repetition_penalty: 1.25,
      do_sample: false
    });

    let text = '';
    if (out && out[0] && out[0].generated_text) {
      const gen = out[0].generated_text;
      if (Array.isArray(gen)) {
        text = gen.at(-1)?.content || '';
      } else if (typeof gen === 'string') {
        text = gen;
      }
    }
    return text.replace(/^(assistant|system|bot|aura):\s*/i, '').trim();
  })();

  return Promise.race([generatePromise, timeoutPromise]);
}

// Coordinador de la Cadena de Responsabilidad (GoF #3.1)
async function processThroughCoHostChain(author, message) {
  // Eslabón 1: Match Semántico Inmediato (< 5ms)
  const semanticReply = FastSemanticHandler.handle(author, message);
  if (semanticReply && isResponseCoherent(semanticReply)) {
    return semanticReply;
  }

  // Eslabón 2: Si el usuario seleccionó SmolLM2 local explícitamente
  if (currentAIProvider === 'smollm') {
    try {
      const generator = await ensureSmolLMLoaded();
      if (generator) {
        const rawReply = await generateWithSmolLMWithTimeout(generator, author, message, 2000);
        if (isResponseCoherent(rawReply)) {
          return rawReply;
        }
        console.warn(`[CoHostChain] Salida de SmolLM2 no coherente ("${rawReply}"), pasando a Fallback`);
      }
    } catch (err) {
      console.warn(`[CoHostChain] SmolLM2 excedió tiempo límite o falló (${err.message}), pasando a Fallback`);
    }
  }

  // Eslabón 3: Fallback Inteligente Garantizado (Instantáneo)
  return IntelligentCoHostFallbackHandler.handle(author, message);
}

// ============================================================================
// Patrón Command + Queue (GoF #3.2): Procesamiento Secuencial Rápido (< 500ms)
// ============================================================================

const aiCommandQueue = [];
let isProcessingAICommand = false;

async function processNextAICommand() {
  if (isProcessingAICommand || aiCommandQueue.length === 0) return;

  const cmd = aiCommandQueue.shift();
  if (!cmd) return;

  isProcessingAICommand = true;
  try {
    await cmd.execute();
  } catch (err) {
    console.error('[AICommandQueue] Error ejecutando comando:', err);
  } finally {
    isProcessingAICommand = false;
    if (aiCommandQueue.length > 0) {
      setTimeout(processNextAICommand, 300);
    }
  }
}

function enqueueAIResponseCommand(msg) {
  if (!msg) return;
  if (aiCommandQueue.some(c => c.msg && c.msg.id === msg.id)) return;

  aiCommandQueue.push({
    msg,
    execute: async () => {
      updateAIVisualState(true, `Generando respuesta para ${msg.author}...`);
      try {
        // Si el usuario seleccionó un proveedor de backend (Qwen local, Gemini, OpenAI, Ollama), solicitarlo al backend
        if (currentAIProvider === 'local_qwen' || currentAIProvider === 'gemini' || currentAIProvider === 'openai' || currentAIProvider === 'ollama') {
          socket.emit('request_ai_reply', msg);
          return;
        }

        // Para Modo Inteligente Local y SmolLM2: Ejecutar Cadena de Responsabilidad (Instantánea)
        const replyText = await processThroughCoHostChain(msg.author, msg.message);

        // 1. Encolar audio para reproducir
        enqueueSpeech(replyText, msg.author, selectedVoiceLang);

        // 2. Notificar a Socket.io para que el overlay de OBS y el historial lo reciban
        socket.emit('client_ai_reply', {
          originalMessage: msg,
          replyText,
          lang: selectedVoiceLang
        });

        updateAIVisualState(false, 'Listo para responder');
      } catch (err) {
        console.error('[AICommand] Error procesando mensaje:', err);
        const replyText = IntelligentCoHostFallbackHandler.handle(msg.author, msg.message);
        enqueueSpeech(replyText, msg.author, selectedVoiceLang);
        socket.emit('client_ai_reply', {
          originalMessage: msg,
          replyText,
          lang: selectedVoiceLang
        });
        updateAIVisualState(false, 'Listo para responder');
      }
    }
  });

  processNextAICommand();
}

// Frases de muestra según idioma seleccionado
function getVoiceSampleText(langCode) {
  if (langCode.startsWith('en')) {
    return 'Hello, this is a voice test in English for the live stream co-host.';
  }
  if (langCode.startsWith('ru')) {
    return 'Привет, это проверка голоса на русском языке для стрима.';
  }
  if (langCode.startsWith('zh')) {
    return '你好，这是用于直播副驾驶的中文语音测试。';
  }
  return 'Hola streamer, esta es una prueba de voz en español para tu transmisión en vivo.';
}

// Cargar y poblar lista de voces según el idioma seleccionado
function populateVoiceList() {
  if (!('speechSynthesis' in window) || !cfgVoiceSelect) return;

  const voices = window.speechSynthesis.getVoices();
  const filterLang = cfgVoiceLang ? cfgVoiceLang.value : 'es';

  cfgVoiceSelect.innerHTML = '';

  const filteredVoices = voices.filter(v => {
    if (filterLang === 'all') return true;
    return v.lang.toLowerCase().startsWith(filterLang);
  });

  if (filteredVoices.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = `No hay voces locales para "${filterLang}" (usando voz estándar)`;
    cfgVoiceSelect.appendChild(opt);
    return;
  }

  filteredVoices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — Sistema' : ''}`;
    option.dataset.lang = voice.lang;
    if (voice.name === selectedVoiceName) {
      option.selected = true;
    }
    cfgVoiceSelect.appendChild(option);
  });

  if (!cfgVoiceSelect.value && filteredVoices.length > 0) {
    cfgVoiceSelect.selectedIndex = 0;
    selectedVoiceName = cfgVoiceSelect.value;
  }
}

// Cola de Audio Secuencial con Servicio de Streaming MP3 Nativo
function enqueueSpeech(text, author = '', lang = '') {
  if (isAudioMuted || !text) return;
  const targetLang = lang || selectedVoiceLang || (cfgVoiceLang ? cfgVoiceLang.value : 'es');
  speechQueue.push({ text, author, lang: targetLang });
  processSpeechQueue();
}

let activeAudioElement = null;

function processSpeechQueue() {
  if (isSpeaking || speechQueue.length === 0) return;

  const current = speechQueue.shift();
  isSpeaking = true;

  updateAIVisualState(true, `Hablando con ${current.author || 'la audiencia'}...`);

  const langCode = current.lang || selectedVoiceLang || 'es';
  const audioUrl = `/api/tts?text=${encodeURIComponent(current.text)}&lang=${encodeURIComponent(langCode)}`;

  // Reproducción por streaming MP3 (Chino, Ruso, Inglés y Español garantizados)
  try {
    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement = null;
    }

    const audio = new Audio(audioUrl);
    activeAudioElement = audio;
    audio.volume = audioVolume;

    audio.onended = () => {
      isSpeaking = false;
      activeAudioElement = null;
      updateAIVisualState(false, 'Listo para responder');
      setTimeout(processSpeechQueue, 200);
    };

    audio.onerror = (err) => {
      console.warn('Error en streaming de audio, usando síntesis local de respaldo:', err);
      fallbackToWebSpeech(current);
    };

    audio.play().catch((playErr) => {
      console.warn('Bloqueo de autoplay o fallo en audio.play():', playErr);
      fallbackToWebSpeech(current);
    });
  } catch (err) {
    fallbackToWebSpeech(current);
  }
}

function fallbackToWebSpeech(current) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.text);
    utterance.volume = audioVolume;
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const activeVoiceName = selectedVoiceName || (cfgVoiceSelect ? cfgVoiceSelect.value : '');
    let chosenVoice = voices.find(v => v.name === activeVoiceName);

    if (!chosenVoice) {
      const preferredLang = current.lang || 'es';
      chosenVoice = voices.find(v => v.lang.toLowerCase().startsWith(preferredLang)) || voices[0];
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    }

    utterance.onend = () => {
      isSpeaking = false;
      updateAIVisualState(false, 'Listo para responder');
      setTimeout(processSpeechQueue, 200);
    };

    utterance.onerror = () => {
      isSpeaking = false;
      updateAIVisualState(false, 'Listo para responder');
      setTimeout(processSpeechQueue, 200);
    };

    window.speechSynthesis.speak(utterance);
  } else {
    setTimeout(() => {
      isSpeaking = false;
      updateAIVisualState(false, 'Listo para responder');
      processSpeechQueue();
    }, 2000);
  }
}

function updateAIVisualState(speaking, label) {
  if (speaking) {
    aiIntelligenceCard.classList.add('speaking');
    aiStateLabel.textContent = label || 'Hablando...';
    aiStateLabel.style.color = 'var(--apple-pink)';
  } else {
    aiIntelligenceCard.classList.remove('speaking');
    aiStateLabel.textContent = label || 'Listo para responder';
    aiStateLabel.style.color = 'var(--label-secondary)';
  }
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    populateVoiceList();
  };
  // Intento de carga inicial
  setTimeout(populateVoiceList, 150);
}

if (cfgVoiceLang) {
  if (selectedVoiceLang) cfgVoiceLang.value = selectedVoiceLang;
  cfgVoiceLang.addEventListener('change', () => {
    populateVoiceList();
  });
}

if (btnPreviewVoice) {
  btnPreviewVoice.addEventListener('click', () => {
    const activeLang = cfgVoiceLang ? cfgVoiceLang.value : (selectedVoiceLang || 'es');
    const sample = getVoiceSampleText(activeLang);
    enqueueSpeech(sample, 'Muestra', activeLang);
  });
}

// Socket: Estado inicial
socket.on('initial_state', (state) => {
  if (state.tiktok.isConnected) {
    setPlatformStatus('tiktok', 'connected', state.tiktok.username);
  }
  if (state.youtube.isConnected) {
    setPlatformStatus('youtube', 'connected', state.youtube.videoId);
  }
  if (state.simulator.isRunning) {
    setSimStatus(true);
  }
  if (state.autoPilot) {
    chkAutoPilot.checked = state.autoPilot.enabled;
    rngCooldown.value = state.autoPilot.cooldownSeconds;
    cooldownLabel.textContent = `${state.autoPilot.cooldownSeconds}s`;
    const chkReplyAll = document.getElementById('chkReplyAll');
    if (chkReplyAll) {
      chkReplyAll.checked = !state.autoPilot.onlyQuestions;
    }
  }
  if (state.ai) {
    displayBotName.textContent = state.ai.botName || 'Aura';
    cfgBotName.value = state.ai.botName || 'Aura';
    currentAIProvider = state.ai.provider || 'fallback';
    cfgProvider.value = currentAIProvider;
    if (state.ai.personalityPrompt) cfgPrompt.value = state.ai.personalityPrompt;
  }
});

// Socket: Mensajes de Chat
socket.on('chat_message', (msg) => {
  totalMessages++;
  statTotalMsgs.textContent = totalMessages;

  if (emptyFeedNotice) {
    emptyFeedNotice.style.display = 'none';
  }

  const bubble = document.createElement('div');
  bubble.className = `liquid-chat-bubble ${msg.isQuestion ? 'is-question' : ''} ${msg.isGift ? 'is-gift' : ''}`;
  bubble.dataset.id = msg.id;
  bubble.dataset.author = (msg.author || '').toLowerCase();
  bubble.dataset.text = (msg.message || '').toLowerCase();

  const isTikTok = msg.platform === 'tiktok';
  const platformName = isTikTok ? 'TikTok' : 'YouTube';
  const platformClass = isTikTok ? 'tiktok' : 'youtube';

  bubble.innerHTML = `
    <img src="${msg.avatar}" alt="${msg.author}" class="bubble-avatar" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=apple'" />
    <div class="bubble-content">
      <div class="bubble-meta">
        <span class="bubble-author">${escapeHtml(msg.nickname || msg.author)}</span>
        <span class="bubble-platform-pill ${platformClass}">${platformName}</span>
        ${msg.isQuestion ? '<span style="font-size: 11px; color: var(--apple-blue); font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><span style="width: 5px; height: 5px; border-radius: 50%; background: var(--apple-blue); display: inline-block;"></span>Pregunta</span>' : ''}
        ${msg.isGift ? '<span style="font-size: 11px; color: var(--apple-pink); font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><span style="width: 5px; height: 5px; border-radius: 50%; background: var(--apple-pink); display: inline-block;"></span>Donación</span>' : ''}
      </div>
      <div class="bubble-text">${escapeHtml(msg.message)}</div>
      <div class="bubble-actions">
        <button class="apple-glass-btn sm primary btn-action-reply">
          <svg class="sf-icon" style="width: 12px; height: 12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          Responder
        </button>
        <button class="apple-glass-btn sm btn-action-read">
          <svg class="sf-icon" style="width: 12px; height: 12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
          Leer
        </button>
      </div>
    </div>
  `;

  bubble.querySelector('.btn-action-reply').addEventListener('click', () => {
    enqueueAIResponseCommand(msg);
  });

  bubble.querySelector('.btn-action-read').addEventListener('click', () => {
    socket.emit('read_tts_message', msg);
  });

  // Filtro de búsqueda en vivo
  if (currentSearchQuery && !bubble.dataset.text.includes(currentSearchQuery) && !bubble.dataset.author.includes(currentSearchQuery)) {
    bubble.style.display = 'none';
  }

  chatFeed.appendChild(bubble);

  if (chkAutoScroll.checked) {
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }
});

// Socket: Estado de pensamiento de IA en Backend
socket.on('ai_thinking', (data) => {
  updateAIVisualState(true, `Qwen pensando para ${data.author || 'Chat'}...`);
});

// Socket: Respuestas de IA
socket.on('ai_reply', (data) => {
  totalReplies++;
  statTotalReplies.textContent = totalReplies;
  updateAIVisualState(false, 'Listo para responder');

  enqueueSpeech(data.replyText, data.originalMessage?.author);

  if (replyHistory.querySelector('div[style*="text-align: center"]')) {
    replyHistory.innerHTML = '';
  }

  const replyEl = document.createElement('div');
  replyEl.className = 'apple-reply-pill';
  replyEl.innerHTML = `
    <div class="target-tag">
      A ${escapeHtml(data.originalMessage?.author || 'Espectador')} ${data.isAutoPilot ? '(Auto-Pilot)' : ''}
    </div>
    <div style="color: rgba(255, 255, 255, 0.95);">${escapeHtml(data.replyText)}</div>
  `;

  replyHistory.insertBefore(replyEl, replyHistory.firstChild);
});

// Socket: Lectura TTS directa
socket.on('play_audio_tts', (data) => {
  enqueueSpeech(data.text, data.author);
});

// Socket: Disparador de Auto-Pilot para SmolLM2 local
socket.on('trigger_client_smollm', (data) => {
  if (data && data.msg) {
    enqueueAIResponseCommand(data.msg);
  }
});

// Socket: Estado de Conexión
socket.on('connection_status', (data) => {
  setPlatformStatus(data.platform, data.status, data.username || data.videoId);
});

function setPlatformStatus(platform, status, identifier) {
  const isTT = platform === 'tiktok';
  const dot = isTT ? ttStatusDot : ytStatusDot;
  const text = isTT ? ttStatusText : ytStatusText;
  const btn = isTT ? btnConnectTT : btnConnectYT;

  dot.className = 'channel-badge-pill';

  if (status === 'connected') {
    dot.classList.add('connected');
    text.textContent = `En vivo: ${identifier}`;
    btn.textContent = 'Desconectar';
    btn.className = 'apple-glass-btn sm destructive';
  } else if (status === 'connecting') {
    dot.classList.add('connecting');
    text.textContent = 'Conectando...';
  } else {
    text.textContent = 'Desconectado';
    btn.textContent = 'Conectar';
    btn.className = 'apple-glass-btn sm primary';
  }
}

// Simulador
function setSimStatus(running) {
  isSimLoopRunning = running;
  if (running) {
    simStatusDot.className = 'channel-badge-pill connected';
    btnToggleSimLoop.textContent = 'Detener Flujo';
    btnToggleSimLoop.className = 'apple-glass-btn sm destructive';
  } else {
    simStatusDot.className = 'channel-badge-pill';
    btnToggleSimLoop.textContent = 'Flujo Continuo';
    btnToggleSimLoop.className = 'apple-glass-btn sm primary';
  }
}

btnSimulateOne.addEventListener('click', () => {
  socket.emit('simulate_single');
});

btnToggleSimLoop.addEventListener('click', () => {
  isSimLoopRunning = !isSimLoopRunning;
  setSimStatus(isSimLoopRunning);
  socket.emit('toggle_simulator', { start: isSimLoopRunning, intervalMs: 3500 });
});

// Conectar TikTok & YouTube
btnConnectTT.addEventListener('click', () => {
  if (btnConnectTT.textContent === 'Desconectar') {
    socket.emit('disconnect_tiktok');
  } else {
    const val = ttUsernameInput.value.trim();
    if (!val) return alert('Por favor ingresa un @usuario de TikTok');
    socket.emit('connect_tiktok', { username: val });
  }
});

btnConnectYT.addEventListener('click', () => {
  if (btnConnectYT.textContent === 'Desconectar') {
    socket.emit('disconnect_youtube');
  } else {
    const val = ytUrlInput.value.trim();
    if (!val) return alert('Por favor ingresa la URL o ID del Live de YouTube');
    socket.emit('connect_youtube', { urlOrId: val });
  }
});

// Búsqueda en el Chat en Tiempo Real
txtSearchChat.addEventListener('input', (e) => {
  currentSearchQuery = e.target.value.toLowerCase().trim();
  const bubbles = chatFeed.querySelectorAll('.liquid-chat-bubble');
  bubbles.forEach(b => {
    const matches = !currentSearchQuery || b.dataset.text.includes(currentSearchQuery) || b.dataset.author.includes(currentSearchQuery);
    b.style.display = matches ? 'flex' : 'none';
  });
});

// Atajo de teclado ⌘K / Ctrl+K para buscar
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    txtSearchChat.focus();
  }
  if (e.key === 'Escape' && settingsModal.classList.contains('active')) {
    closeModal();
  }
});

// Auto-Pilot
chkAutoPilot.addEventListener('change', () => {
  socket.emit('update_autopilot', { enabled: chkAutoPilot.checked });
});

const chkReplyAll = document.getElementById('chkReplyAll');
if (chkReplyAll) {
  chkReplyAll.addEventListener('change', () => {
    socket.emit('update_autopilot', { onlyQuestions: !chkReplyAll.checked });
  });
}

rngCooldown.addEventListener('input', () => {
  cooldownLabel.textContent = `${rngCooldown.value}s`;
  socket.emit('update_autopilot', { cooldownSeconds: parseInt(rngCooldown.value) });
});

// Limpiar feed
btnClearFeed.addEventListener('click', () => {
  chatFeed.innerHTML = '';
});

// Controles de audio
rngVolume.addEventListener('input', () => {
  audioVolume = parseFloat(rngVolume.value);
});

btnMuteAudio.addEventListener('click', () => {
  isAudioMuted = !isAudioMuted;
  btnMuteAudio.textContent = isAudioMuted ? 'Activar Sonido' : 'Silenciar';
  btnMuteAudio.className = isAudioMuted ? 'apple-glass-btn sm destructive' : 'apple-glass-btn sm';
  if (isAudioMuted && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    speechQueue = [];
    isSpeaking = false;
    updateAIVisualState(false, 'Silenciado');
  }
});

btnTestVoice.addEventListener('click', () => {
  const activeLang = selectedVoiceLang || (cfgVoiceLang ? cfgVoiceLang.value : 'es');
  const sample = getVoiceSampleText(activeLang);
  enqueueSpeech(sample, 'Streamer', activeLang);
});

// Modal / Apple Sheet
btnOpenSettings.addEventListener('click', () => {
  settingsModal.classList.add('active');
});

const closeModal = () => settingsModal.classList.remove('active');
btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);

btnSaveSettings.addEventListener('click', () => {
  const newName = cfgBotName.value.trim() || 'Aura';
  const newProvider = cfgProvider.value;
  const newApiKey = cfgApiKey.value.trim();
  const newPrompt = cfgPrompt.value.trim();

  if (cfgVoiceSelect && cfgVoiceSelect.value) {
    selectedVoiceName = cfgVoiceSelect.value;
    localStorage.setItem('streamai_voice_name', selectedVoiceName);
  }
  if (cfgVoiceLang && cfgVoiceLang.value) {
    selectedVoiceLang = cfgVoiceLang.value;
    localStorage.setItem('streamai_voice_lang', selectedVoiceLang);
  }

  currentAIProvider = newProvider;
  if (newProvider === 'smollm') {
    ensureSmolLMLoaded();
  }

  socket.emit('update_ai_config', {
    botName: newName,
    provider: newProvider,
    apiKey: newApiKey,
    personalityPrompt: newPrompt
  });

  socket.emit('update_tts_config', {
    lang: selectedVoiceLang
  });

  displayBotName.textContent = newName;
  closeModal();
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
