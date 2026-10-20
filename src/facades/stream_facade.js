import { AIProviderFactory } from '../factories/ai_factory.js';
import { TTSService } from '../services/tts.js';
import { TikTokConnector } from '../connectors/tiktok.js';
import { YouTubeConnector } from '../connectors/youtube.js';
import { ChatSimulator } from '../services/simulator.js';
import { createCanonicalChatMessage } from '../domain/contracts.js';

// ============================================================================
// Patrón Facade (GoF #2.5): Fachada Unificada del Subsistema StreamAI Co-Host
// ============================================================================

export class StreamAICoHostFacade {
  constructor(io) {
    this.io = io;

    // Núcleo de Servicios
    this.tts = new TTSService();
    this.botName = 'Aura';
    this.personalityPrompt = 'Eres Aura, la copiloto divertida, amigable y carismática del stream. Responde de forma muy natural, ingeniosa y en máximo 1 o 2 oraciones en español coloquial. Saluda al autor si hace una pregunta.';
    
    // Fábrica y Adaptador Activo de IA (GoF #1.2 + #2.1 + #3.9)
    this.activeProviderId = 'local_qwen';
    this.apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.aiAdapter = AIProviderFactory.createAdapter(this.activeProviderId, { apiKey: this.apiKey });
    
    // Inbound Connectors (Adaptadores de Entrada)
    this.tiktok = new TikTokConnector(this.io);
    this.youtube = new YouTubeConnector(this.io);
    this.simulator = new ChatSimulator(this.io);

    // Estado del Auto-Pilot (GoF #3.2 Command Queue)
    this.autoPilotState = {
      enabled: false,
      onlyQuestions: false,
      cooldownSeconds: 8,
      lastReplyTime: 0
    };
    this.autoPilotQueue = [];
    this.isProcessingAutoPilot = false;

    // Inicializar adaptador de IA
    this.initAIAdapter();
  }

  async initAIAdapter() {
    try {
      await this.aiAdapter.initialize();
    } catch (err) {
      console.warn(`[StreamFacade] Error inicializando adaptador ${this.activeProviderId}:`, err.message);
    }
  }

  updateAIConfig({ botName, personalityPrompt, provider, apiKey }) {
    if (botName) this.botName = botName;
    if (personalityPrompt) this.personalityPrompt = personalityPrompt;
    if (apiKey !== undefined) this.apiKey = apiKey;

    if (provider && provider !== this.activeProviderId) {
      this.activeProviderId = provider;
      this.aiAdapter = AIProviderFactory.createAdapter(this.activeProviderId, { apiKey: this.apiKey });
      this.initAIAdapter();
    }
  }

  getSystemStatus() {
    return {
      tiktok: this.tiktok.getStatus(),
      youtube: this.youtube.getStatus(),
      simulator: { isRunning: this.simulator.isRunning },
      autoPilot: this.autoPilotState,
      ai: {
        provider: this.activeProviderId,
        botName: this.botName,
        hasApiKey: Boolean(this.apiKey),
        personalityPrompt: this.personalityPrompt
      },
      tts: {
        lang: this.tts.lang,
        rate: this.tts.rate,
        volume: this.tts.volume,
        isMuted: this.tts.isMuted
      }
    };
  }

  // ==========================================================================
  // Ingesta Canónica de Mensajes y Auto-Pilot
  // ==========================================================================

  onChatMessageReceived(rawMessage) {
    try {
      const canonical = createCanonicalChatMessage(rawMessage);
      this.handleAutoPilot(canonical);
      return canonical;
    } catch (err) {
      console.error('[StreamFacade] Error normalizando mensaje a LiveChatMessage:', err);
      return rawMessage;
    }
  }

  handleAutoPilot(canonicalMsg) {
    if (!this.autoPilotState.enabled) return;

    if (this.autoPilotState.onlyQuestions && !canonicalMsg.isQuestion) {
      return;
    }

    if (this.autoPilotQueue.length < 50) {
      this.autoPilotQueue.push(canonicalMsg);
    }
    this.processNextAutoPilotCommand();
  }

  processNextAutoPilotCommand() {
    if (!this.autoPilotState.enabled || this.autoPilotQueue.length === 0 || this.isProcessingAutoPilot) {
      return;
    }

    const now = Date.now();
    const elapsed = (now - this.autoPilotState.lastReplyTime) / 1000;
    if (elapsed < this.autoPilotState.cooldownSeconds) {
      setTimeout(() => this.processNextAutoPilotCommand(), Math.max(300, (this.autoPilotState.cooldownSeconds - elapsed) * 1000));
      return;
    }

    const msg = this.autoPilotQueue.shift();
    if (!msg) return;

    this.isProcessingAutoPilot = true;
    this.autoPilotState.lastReplyTime = Date.now();

    (async () => {
      try {
        await this.generateAndBroadcastReply(msg, true);
      } catch (err) {
        console.error('[StreamFacade] Error en despacho Auto-Pilot:', err);
      } finally {
        setTimeout(() => {
          this.isProcessingAutoPilot = false;
          this.processNextAutoPilotCommand();
        }, 2000);
      }
    })();
  }

  async generateAndBroadcastReply(msg, isAutoPilot = false) {
    this.io.emit('ai_thinking', { author: msg.author, message: msg.message });

    let replyText = '';
    try {
      replyText = await this.aiAdapter.execute(msg.author, msg.message, this.personalityPrompt);
    } catch (err) {
      console.warn(`[StreamFacade] Error con adaptador ${this.activeProviderId}, usando Heurístico:`, err.message);
      const fallbackAdapter = AIProviderFactory.createAdapter('fallback');
      replyText = await fallbackAdapter.execute(msg.author, msg.message, this.personalityPrompt);
    }

    if (!replyText) {
      const fallbackAdapter = AIProviderFactory.createAdapter('fallback');
      replyText = await fallbackAdapter.execute(msg.author, msg.message, this.personalityPrompt);
    }

    const audioPayload = this.tts.getAudioPayload(replyText, msg.author);

    this.io.emit('ai_reply', {
      id: `reply_${Date.now()}`,
      originalMessage: msg,
      replyText,
      audioPayload,
      isAutoPilot,
      provider: this.activeProviderId,
      timestamp: Date.now()
    });

    return replyText;
  }
}
