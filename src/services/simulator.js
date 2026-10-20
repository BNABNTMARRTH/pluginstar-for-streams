export class ChatSimulator {
  constructor(io) {
    this.io = io;
    this.isRunning = false;
    this.timer = null;

    this.sampleUsers = [
      { name: 'GamerPro_99', platform: 'tiktok', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gamer99' },
      { name: 'Camila_Live', platform: 'tiktok', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=camila' },
      { name: 'CarlosStreams', platform: 'youtube', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=carlos' },
      { name: 'Sofi_Pixel', platform: 'tiktok', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sofi' },
      { name: 'TechMaster', platform: 'youtube', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tech' },
      { name: 'Juanito_12', platform: 'tiktok', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=juanito' },
      { name: 'Valen_Rider', platform: 'youtube', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=valen' },
      { name: 'Alex_Zero', platform: 'tiktok', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alex' }
    ];

    this.sampleMessages = [
      { text: '¿A qué hora juegas la siguiente partida?', isQuestion: true },
      { text: '¡Saludos desde México! Excelente transmisión.', isQuestion: false },
      { text: '¿Cuál es tu personaje favorito de este juego?', isQuestion: true },
      { text: 'No me esperaba esa jugada, estuvo muy buena.', isQuestion: false },
      { text: '¿Puedes mandar un saludo para mi primo Mateo?', isQuestion: true },
      { text: '¡El mejor directo del día! Sigue así.', isQuestion: false },
      { text: '¿Cuánto tiempo llevas transmitiendo?', isQuestion: true },
      { text: '¿Qué opinas de la nueva actualización que salió ayer?', isQuestion: true },
      { text: 'Qué buena música tienes puesta de fondo.', isQuestion: false },
      { text: '¿Tienes canal de Discord para la comunidad?', isQuestion: true },
      { text: 'Dejen su me gusta gente, apoyen el stream.', isQuestion: false }
    ];

    this.sampleGifts = [
      { name: 'Rosa', count: 1, diamondCount: 1 },
      { name: 'Corazón', count: 5, diamondCount: 10 },
      { name: 'Gorra de Fiesta', count: 1, diamondCount: 99 },
      { name: 'Super Chat $5.00', count: 1, diamondCount: 500 }
    ];
  }

  generateOneMessage() {
    const user = this.sampleUsers[Math.floor(Math.random() * this.sampleUsers.length)];
    const isGiftChance = Math.random() < 0.15; // 15% probabilidad de regalo

    if (isGiftChance) {
      const gift = this.sampleGifts[Math.floor(Math.random() * this.sampleGifts.length)];
      return {
        id: `sim_gift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        platform: user.platform,
        author: user.name,
        nickname: user.name,
        avatar: user.avatar,
        message: `Envió un regalo: ${gift.name} ${gift.count > 1 ? 'x' + gift.count : ''}`,
        timestamp: Date.now(),
        isGift: true,
        giftInfo: gift
      };
    }

    const msg = this.sampleMessages[Math.floor(Math.random() * this.sampleMessages.length)];
    return {
      id: `sim_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      platform: user.platform,
      author: user.name,
      nickname: user.name,
      avatar: user.avatar,
      message: msg.text,
      timestamp: Date.now(),
      isQuestion: msg.isQuestion,
      badges: Math.random() < 0.3 ? ['VIP'] : []
    };
  }

  start(intervalMs = 4000) {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(() => {
      const msg = this.generateOneMessage();
      this.io.emit('chat_message', msg);
    }, intervalMs);

    this.io.emit('simulator_status', { isRunning: true, intervalMs });
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.io.emit('simulator_status', { isRunning: false });
  }

  emitSingle() {
    const msg = this.generateOneMessage();
    this.io.emit('chat_message', msg);
    return msg;
  }
}
