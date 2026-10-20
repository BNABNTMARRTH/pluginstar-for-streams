# Voice Synthesis TTS Specification

## Purpose
Convierte el texto de respuesta o comentarios seleccionados en audio de voz natural en español y coordina su reproducción en una cola secuencial sin solapamiento sonoro.

## Requirements

### Requirement: Síntesis de Voz Universal Multi-Idioma (Streaming MP3)
El sistema SHALL sintetizar texto a audio mediante un servidor de streaming en `/api/tts?text=...&lang=...` con soporte garantizado en 4 idiomas principales:
- Español (`es`)
- Inglés (`en`)
- Ruso (`ru`)
- Chino Mandarín (`zh-CN` / `zh`)
El servidor entregará un flujo nativo `audio/mpeg` (MP3) reproducible directamente por cualquier navegador sin depender de los paquetes de idioma instalados en el sistema operativo del usuario.

#### Scenario: Generación exitosa de audio multi-idioma
- **WHEN** se solicita la lectura de un texto en cualquiera de los 4 idiomas soportados (`es`, `en`, `ru`, `zh`)
- **THEN** el sistema devuelve un stream de audio en formato MP3 con código de estado HTTP 200 y pronunciación nativa clara lista para reproducción inmediata

### Requirement: Cola de Reproducción Secuencial
El sistema SHALL gestionar una cola de mensajes de audio para asegurar que las respuestas se reproduzcan una detrás de otra sin sobreponerse.

#### Scenario: Encolado de múltiples mensajes
- **WHEN** se envían dos o más comentarios a reproducir simultáneamente
- **THEN** el primer mensaje se reproduce de inmediato y los siguientes esperan en cola hasta que finalice el anterior

### Requirement: Controles de Audio y Cancelación Rápida
El sistema SHALL proveer controles para ajustar el volumen, pausar la reproducción y purgar o detener de emergencia el audio en curso.

#### Scenario: Detención de emergencia del audio
- **WHEN** el streamer presiona el botón "Silenciar / Detener Audio"
- **THEN** el sistema cancela inmediatamente la reproducción activa y vacía la cola pendiente
