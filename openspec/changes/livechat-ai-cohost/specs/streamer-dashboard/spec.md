# Spec Delta

## Purpose
Provee una interfaz web gráfica con diseño oscuro prémium para que el streamer controle las transmisiones, visualice el flujo de comentarios en tiempo real y proporcione una vista de overlay transparente para OBS Studio.

## ADDED Requirements

### Requirement: Panel Central de Control estilo Apple Liquid Glass (macOS HIG)
El sistema SHALL mostrar un panel visual basado en el patrón **Apple Liquid Glass** (macOS Sequoia / Landmarks design pattern) con arquitectura `NavigationSplitView` de triple panel (Sidebar, Chat Feed, Inspector), barra de ventana con controles de semáforo de macOS, botones hápticos translúcidos `.buttonStyle(.glass)`, orbe cromático reactivo estilo Apple Intelligence y **estricto uso de iconografía minimalista vectorial (SVG estilo SF Symbols) sin emojis**.

#### Scenario: Visualización del panel Liquid Glass
- **WHEN** el usuario carga la aplicación en su navegador web (`http://localhost:3050`)
- **THEN** el sistema presenta la interfaz con efectos de glassmorphism con desenfoque de fondo (`backdrop-filter: blur`), micro-biseles especulares y tipografía moderna inspirada en SF Pro

### Requirement: Feed Interactivo de Comentarios con Acciones Directas
El sistema SHALL presentar los comentarios entrantes con distintivo de plataforma, autor y texto, acompañados de botones de acción rápida para responder con IA o leer el texto original.

#### Scenario: Interacción manual con un comentario
- **WHEN** el streamer hace clic en "Responder con IA" sobre un comentario en el feed
- **THEN** el sistema envía dicho comentario al procesador de IA y reproduce la respuesta resultante

### Requirement: Vista de Overlay Transparente para OBS Studio
El sistema SHALL servir una ruta web dedicada (`/overlay`) con fondo transparente que muestre el avatar animado del copiloto, la pregunta del espectador y la respuesta textual sincronizada con la voz.

#### Scenario: Carga del overlay en OBS Studio
- **WHEN** se agrega la URL `/overlay` como Browser Source en OBS Studio
- **THEN** la vista se renderiza con fondo 100% transparente y escucha eventos WebSocket para mostrar las animaciones de voz
