export class TTSService {
  constructor() {
    this.lang = 'es';
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.isMuted = false;

    // Mapa de códigos de idioma estandarizados
    this.langMap = {
      es: 'es',
      en: 'en',
      ru: 'ru',
      zh: 'zh-CN'
    };
  }

  updateConfig(config = {}) {
    if (config.lang) this.lang = config.lang;
    if (config.rate !== undefined) this.rate = parseFloat(config.rate);
    if (config.pitch !== undefined) this.pitch = parseFloat(config.pitch);
    if (config.volume !== undefined) this.volume = parseFloat(config.volume);
    if (config.isMuted !== undefined) this.isMuted = Boolean(config.isMuted);
  }

  getAudioPayload(text, author = '', lang = null) {
    const activeLang = lang || this.lang || 'es';
    const targetLang = this.langMap[activeLang] || activeLang;
    const audioUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(targetLang)}`;

    return {
      text,
      author,
      lang: targetLang,
      audioUrl,
      volume: this.volume,
      isMuted: this.isMuted,
      timestamp: Date.now()
    };
  }

  async fetchAudioBuffer(text, lang = 'es') {
    const targetLang = this.langMap[lang] || lang || 'es';
    const cleanText = text.trim();

    // Servicio universal de síntesis MP3 con soporte nativo de chino, ruso, inglés y español
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${encodeURIComponent(targetLang)}&client=tw-ob`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`Error en servicio de síntesis TTS: ${res.status} ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
