import { getLlama, LlamaChatSession } from 'node-llama-cpp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class QwenLocalEngine {
  constructor() {
    this.llama = null;
    this.model = null;
    this.context = null;
    this.session = null;
    this.isInitializing = false;
    this.isReady = false;
    this.modelPath = path.join(__dirname, '../../models/qwen/qwen2.5-0.5b-instruct-q4_k_m.gguf');
    this.personalityPrompt = 'Eres Aura, la copiloto divertida, amigable y carismática del stream. Responde de forma muy natural, ingeniosa y en máximo 1 o 2 oraciones breves en español coloquial. Saluda al autor.';
  }

  // Patrón Singleton (GoF #1.5)
  static getInstance() {
    if (!QwenLocalEngine.instance) {
      QwenLocalEngine.instance = new QwenLocalEngine();
    }
    return QwenLocalEngine.instance;
  }

  async initialize() {
    if (this.isReady) return true;
    if (this.isInitializing) return false;
    this.isInitializing = true;

    try {
      if (!fs.existsSync(this.modelPath)) {
        console.warn(`[QwenLocalEngine] Modelo GGUF no encontrado en: ${this.modelPath}`);
        this.isInitializing = false;
        return false;
      }

      console.log('[QwenLocalEngine] Inicializando Llama con soporte Metal GPU en Apple Silicon...');
      this.llama = await getLlama({ gpu: 'metal' });
      this.model = await this.llama.loadModel({
        modelPath: this.modelPath
      });

      this.context = await this.model.createContext({
        contextSize: 2048
      });

      this.session = new LlamaChatSession({
        contextSequence: this.context.getSequence(),
        systemPrompt: this.personalityPrompt
      });

      this.isReady = true;
      this.isInitializing = false;
      console.log('✔ [QwenLocalEngine] Qwen 2.5 (0.5B Instruct) cargado exitosamente en Metal GPU.');
      return true;
    } catch (err) {
      console.error('[QwenLocalEngine] Error inicializando modelo local:', err);
      this.isInitializing = false;
      this.isReady = false;
      return false;
    }
  }

  setPersonalityPrompt(prompt) {
    if (prompt && prompt !== this.personalityPrompt) {
      this.personalityPrompt = prompt;
      if (this.session) {
        try {
          this.session.setChatHistory([{ type: 'system', text: this.personalityPrompt }]);
        } catch (err) {
          console.warn('[QwenLocalEngine] Error actualizando prompt en sesión:', err.message);
        }
      }
    }
  }

  async generate(author, message) {
    if (!this.isReady) {
      const ok = await this.initialize();
      if (!ok) throw new Error('Qwen local no disponible');
    }

    const userMessage = `${author} comenta en el chat: "${message}". Responde con una sola frase breve y divertida en español para ser leída por voz:`;

    const response = await this.session.prompt(userMessage, {
      maxTokens: 45,
      temperature: 0.65,
      repeatPenalty: {
        penalty: 1.25,
        penalizeNewLine: true
      }
    });

    const clean = (response || '')
      .replace(/^(assistant|aura|bot|copiloto):\s*/i, '')
      .replace(/\n+/g, ' ')
      .trim();

    // Validar que no sea solo signos repetidos o texto degenerado
    if (!clean || clean.length < 3 || /(.)\1{3,}/.test(clean) || /^[^a-zA-ZáéíóúñÁÉÍÓÚÑ]+$/.test(clean)) {
      throw new Error('Salida de Qwen no coherente, activando fallback');
    }

    return clean;
  }
}
