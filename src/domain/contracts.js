/**
 * Dominio y Contratos Canónicos del Sistema StreamAI Co-Host
 * Arquitectura Hexagonal: Puertos de Entrada, Núcleo y Puertos de Salida.
 */

// ============================================================================
// Contrato de Entidad Canónica: LiveChatMessage (Inmutable)
// ============================================================================

export function createCanonicalChatMessage({
  id,
  platform,
  author,
  nickname,
  avatar,
  message,
  isQuestion,
  isGift,
  giftData,
  timestamp
}) {
  if (!author || typeof author !== 'string') {
    throw new TypeError('[LiveChatMessage] El campo author es requerido y debe ser string');
  }

  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  const detectedQuestion = Boolean(isQuestion || cleanMessage.includes('?') || cleanMessage.includes('¿'));

  const canonical = {
    id: id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    platform: ['tiktok', 'youtube', 'simulator'].includes(platform) ? platform : 'simulator',
    author: author.trim(),
    nickname: nickname ? nickname.trim() : author.trim(),
    avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author)}`,
    message: cleanMessage,
    isQuestion: detectedQuestion,
    isGift: Boolean(isGift),
    giftData: giftData || null,
    timestamp: typeof timestamp === 'number' ? timestamp : Date.now()
  };

  return Object.freeze(canonical);
}

// ============================================================================
// Contrato de Puerto de Salida: IAIProviderAdapter (GoF Adapter + Strategy)
// ============================================================================

export class BaseAIProviderAdapter {
  constructor(providerId) {
    if (new.target === BaseAIProviderAdapter) {
      throw new TypeError('BaseAIProviderAdapter es abstracta y no puede instanciarse directamente');
    }
    this.providerId = providerId;
  }

  async initialize() {
    return true;
  }

  /**
   * Template Method (GoF #3.10): Flujo de Ejecución y Validación de Respuestas
   */
  async execute(author, message, personalityPrompt) {
    const preprocessed = this.preprocess(author, message);
    const draft = await this.generateResponse(preprocessed.author, preprocessed.message, personalityPrompt);
    const validated = this.validateCoherence(draft);
    return this.postprocess(validated);
  }

  preprocess(author, message) {
    return {
      author: (author || 'Espectador').trim(),
      message: (message || '').trim()
    };
  }

  // Método abstracto que debe implementar cada adaptador concreto
  async generateResponse(author, message, personalityPrompt) {
    throw new Error(`[IAIProviderAdapter] generateResponse no implementado en ${this.constructor.name}`);
  }

  validateCoherence(text) {
    if (!text || typeof text !== 'string') return '';
    const clean = text.trim();
    // Detectar repeticiones de caracteres y símbolos de código
    if (/(.)\1{4,}/.test(clean) || (clean.match(/[\#\*\<\>\=\|\_\/\\\{\}\[\]]/g) || []).length > 2) {
      return '';
    }
    return clean;
  }

  postprocess(text) {
    if (!text) return '';
    return text
      .replace(/^(assistant|aura|bot|copiloto):\s*/i, '')
      .replace(/\n+/g, ' ')
      .trim();
  }
}

// ============================================================================
// Contrato de Puerto de Salida: ITTSAudioAdapter (GoF Adapter)
// ============================================================================

export class BaseTTSAudioAdapter {
  constructor() {
    if (new.target === BaseTTSAudioAdapter) {
      throw new TypeError('BaseTTSAudioAdapter es abstracta');
    }
  }

  async fetchAudioBuffer(text, lang) {
    throw new Error('[ITTSAudioAdapter] fetchAudioBuffer no implementado');
  }

  getAudioPayload(text, author, lang) {
    return {
      text: (text || '').trim(),
      author: (author || 'Espectador').trim(),
      lang: lang || 'es'
    };
  }
}

// ============================================================================
// Contrato de Puerto de Entrada: IInboundConnector (GoF Adapter)
// ============================================================================

export class BaseInboundConnector {
  constructor(platform, eventBus) {
    if (new.target === BaseInboundConnector) {
      throw new TypeError('BaseInboundConnector es abstracta');
    }
    this.platform = platform;
    this.eventBus = eventBus;
    this.isConnected = false;
  }

  connect(targetIdentifier) {
    throw new Error('[IInboundConnector] connect no implementado');
  }

  disconnect() {
    throw new Error('[IInboundConnector] disconnect no implementado');
  }

  getStatus() {
    return {
      platform: this.platform,
      isConnected: this.isConnected
    };
  }

  emitCanonicalMessage(rawPayload) {
    const canonical = createCanonicalChatMessage({
      ...rawPayload,
      platform: this.platform
    });
    if (this.eventBus) {
      this.eventBus.emit('canonical_chat_message', canonical);
    }
    return canonical;
  }
}
