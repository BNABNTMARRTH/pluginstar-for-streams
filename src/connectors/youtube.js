export class YouTubeConnector {
  constructor(io) {
    this.io = io;
    this.videoUrl = null;
    this.videoId = null;
    this.isConnected = false;
    this.pollInterval = null;
    this.continuation = null;
  }

  extractVideoId(input) {
    if (!input) return null;
    const clean = input.trim();
    // Coincidencia con formatos comunes de YouTube
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|shorts\/))([\w-]{11})/);
    if (match && match[1]) {
      return match[1];
    }
    // Si ya es un ID de 11 caracteres
    if (/^[\w-]{11}$/.test(clean)) {
      return clean;
    }
    return null;
  }

  connect(inputUrlOrId) {
    const videoId = this.extractVideoId(inputUrlOrId);
    if (!videoId) {
      throw new Error('Enlace o ID de YouTube Live no válido');
    }

    if (this.isConnected && this.videoId === videoId) {
      return { status: 'already_connected', videoId };
    }

    this.disconnect();
    this.videoId = videoId;
    this.videoUrl = inputUrlOrId;

    this.io.emit('connection_status', {
      platform: 'youtube',
      status: 'connecting',
      videoId: this.videoId
    });

    // Iniciar conexión y sondeo
    this.isConnected = true;
    this.io.emit('connection_status', {
      platform: 'youtube',
      status: 'connected',
      videoId: this.videoId
    });

    // Iniciar sondeo de chat público
    this.startPolling();

    return { status: 'connected', videoId: this.videoId };
  }

  async startPolling() {
    if (!this.isConnected || !this.videoId) return;

    // Sondeo periódico simulando obtención o captura de mensajes públicos
    // En producción se puede conectar con pytchat/youtube-chat o Google API
    this.pollInterval = setInterval(async () => {
      if (!this.isConnected) return;
      // Heartbeat de conexión activa
    }, 4000);
  }

  disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isConnected = false;
    this.io.emit('connection_status', {
      platform: 'youtube',
      status: 'disconnected',
      videoId: this.videoId
    });
    return { status: 'disconnected' };
  }

  getStatus() {
    return {
      platform: 'youtube',
      isConnected: this.isConnected,
      videoId: this.videoId
    };
  }
}
