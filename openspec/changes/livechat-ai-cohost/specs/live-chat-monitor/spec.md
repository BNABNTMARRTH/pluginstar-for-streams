# Spec Delta

## Purpose
Permite la conexión en tiempo real a salas de transmisión en vivo de TikTok y YouTube para capturar, normalizar y transmitir comentarios y eventos de interacción hacia el sistema central.

## ADDED Requirements

### Requirement: Conexión a TikTok Live
El sistema SHALL permitir la conexión a una transmisión en vivo de TikTok utilizando el nombre de usuario (@username) del canal.

#### Scenario: Conexión exitosa a TikTok
- **WHEN** el usuario ingresa un `@username` válido y presiona "Conectar"
- **THEN** el sistema establece conexión con el feed de TikTok y cambia su estado a "Conectado"

#### Scenario: Transmisión no encontrada o fuera de línea
- **WHEN** el usuario ingresa un canal que no se encuentra en vivo
- **THEN** el sistema emite una notificación de advertencia indicando que el directo no fue encontrado

### Requirement: Conexión a YouTube Live
El sistema SHALL permitir la conexión al chat en vivo de YouTube mediante una URL de transmisión o ID de video.

#### Scenario: Conexión exitosa a YouTube
- **WHEN** el usuario ingresa un enlace o ID de un directo activo de YouTube y presiona "Conectar"
- **THEN** el sistema comienza a recibir los mensajes del chat en tiempo real

### Requirement: Normalización Unificada de Mensajes
El sistema SHALL transformar los comentarios de cualquier plataforma a una estructura de datos estándar que incluya identificador único, autor, mensaje, avatar, plataforma y marca de tiempo.

#### Scenario: Recepción de mensaje normalizado
- **WHEN** un espectador comenta en cualquier plataforma conectada
- **THEN** el sistema emite el evento normalizado hacia los clientes WebSocket conectados

### Requirement: Simulación de Comentarios de Prueba
El sistema SHALL proveer una función de generación de comentarios simulados para realizar pruebas sin depender de una transmisión activa.

#### Scenario: Envío de comentario de prueba
- **WHEN** el usuario activa la función "Generar mensaje de prueba"
- **THEN** el sistema inserta un comentario sintético en el feed como si proviniera de una transmisión real
