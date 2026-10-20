import { WebcastPushConnection } from 'tiktok-live-connector';

export class TikTokConnector {
  constructor(io) {
    this.io = io;
    this.connection = null;
    this.username = null;
    this.isConnected = false;
  }

  connect(username) {
    if (!username) {
      throw new Error('El nombre de usuario de TikTok es requerido');
    }

    const cleanUsername = username.replace(/^@/, '').trim();
    if (this.connection && this.username === cleanUsername && this.isConnected) {
      return { status: 'already_connected', username: cleanUsername };
    }

    if (this.connection) {
      this.disconnect();
    }

    this.username = cleanUsername;
    this.connection = new WebcastPushConnection(cleanUsername, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: 1500
    });

    this.io.emit('connection_status', {
      platform: 'tiktok',
      status: 'connecting',
      username: this.username
    });

    this.connection.connect()
      .then(state => {
        this.isConnected = true;
        this.io.emit('connection_status', {
          platform: 'tiktok',
          status: 'connected',
          username: this.username,
          roomId: state.roomId
        });
      })
      .catch(err => {
        this.isConnected = false;
        this.io.emit('connection_status', {
          platform: 'tiktok',
          status: 'error',
          username: this.username,
          error: err.message || 'No se pudo conectar al directo de TikTok'
        });
      });

    // Eventos de chat
    this.connection.on('chat', data => {
      const normalized = {
        id: `tt_${data.msgId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        platform: 'tiktok',
        author: data.uniqueId || data.nickname || 'Anónimo',
        nickname: data.nickname || data.uniqueId || 'Anónimo',
        avatar: data.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(data.uniqueId || 'tt'),
        message: data.comment || '',
        timestamp: Date.now(),
        isQuestion: (data.comment || '').includes('?') || /^(como|cual|que|por que|cuando|donde|quien)/i.test((data.comment || '').trim()),
        badges: []
      };

      if (data.isFollower) normalized.badges.push('Follower');
      if (data.isModerator) normalized.badges.push('Mod');

      this.io.emit('chat_message', normalized);
    });

    // Eventos de regalos (gifts)
    this.connection.on('gift', data => {
      if (data.giftType === 1 && !data.repeatEnd) {
        // Regalo continuo en progreso
        return;
      }

      const normalized = {
        id: `tt_gift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        platform: 'tiktok',
        author: data.uniqueId || 'Anónimo',
        nickname: data.nickname || data.uniqueId || 'Anónimo',
        avatar: data.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(data.uniqueId || 'tt'),
        message: `🎁 Envió un regalo: ${data.giftName} x${data.repeatCount || 1}`,
        timestamp: Date.now(),
        isGift: true,
        giftInfo: {
          name: data.giftName,
          count: data.repeatCount || 1,
          diamondCount: data.diamondCount || 0
        }
      };

      this.io.emit('chat_message', normalized);
    });

    // Eventos de desconexión
    this.connection.on('disconnected', () => {
      this.isConnected = false;
      this.io.emit('connection_status', {
        platform: 'tiktok',
        status: 'disconnected',
        username: this.username
      });
    });

    this.connection.on('streamEnd', () => {
      this.isConnected = false;
      this.io.emit('connection_status', {
        platform: 'tiktok',
        status: 'stream_ended',
        username: this.username
      });
    });

    return { status: 'connecting', username: cleanUsername };
  }

  disconnect() {
    if (this.connection) {
      try {
        this.connection.disconnect();
      } catch (err) {
        console.error('Error al desconectar TikTok:', err);
      }
      this.connection = null;
    }
    this.isConnected = false;
    this.io.emit('connection_status', {
      platform: 'tiktok',
      status: 'disconnected',
      username: this.username
    });
    return { status: 'disconnected' };
  }

  getStatus() {
    return {
      platform: 'tiktok',
      isConnected: this.isConnected,
      username: this.username
    };
  }
}
