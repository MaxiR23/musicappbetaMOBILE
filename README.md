# Beatly App Music 
> **Versión Test** · Streaming moderno de música con React Native

[![Version](https://img.shields.io/badge/version-test-orange)](/)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue)](/)

**Beatly** es tu compañero musical definitivo: descubrí, organizá y disfrutá tu música favorita con una experiencia única y personalizada.

---

## Features

### **Reproducción Completa**
Reproductor inteligente · Reproducción de fondo · Letras

### **Gestión Total**
Playlists editables · Búsqueda potente · Álbumes completos · Perfiles de artistas · Historial inteligente

### **Experiencia Premium**
Dark mode · Colores dinámicos · Animaciones fluidas · Drag & Drop · Skeleton loaders

### **Social**
Sistema de likes · Playlists públicas/privadas · Compartir · Eventos de artistas

---

## Stack Tecnológico

| Categoría | Tecnologías |
|-----------|-------------|
| **Frontend** | React Native · Expo (SDK 51+) · TypeScript · Expo Router |
| **Estado** | Context API · Custom Hooks · AsyncStorage |
| **Reproducción** | react-native-track-player · HLS/DASH Streaming |
| **UI/UX** | expo-linear-gradient · Ionicons · react-native-draglist · Lucide |
| **Backend** | Supabase · REST API · JWT |

---

## Instalación

**Prerrequisitos:** Node.js 18+ · npm 9+ · Expo CLI

**1️⃣ Clonar** el repositorio
```bash
git clone https://github.com/tu-usuario/beatly.git
cd beatly
```

**2️⃣ Instalar** dependencias
```bash
npm install  # o yarn install
```

**3️⃣ Configurar** variables de entorno

Crear `.env` en la raíz:
```env
EXPO_PUBLIC_API_URL=https://tu-backend.com/api
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

**4️⃣ Iniciar** el proyecto
```bash
npx expo start           # Desarrollo
npx expo start --ios     # iOS
npx expo start --android # Android
```

---

## 📁 Estructura del Proyecto

| Directorio | Descripción |
|-----------|-------------|
| `app/` | 🎯 Screens con Expo Router (file-based) |
| `src/components/` | 🧩 Componentes reutilizables (features + shared) |
| `src/hooks/` | 🪝 Custom Hooks (music, api, cache) |
| `src/context/` | 🌐 Context providers (Music, Auth) |
| `src/utils/` | 🛠️ Helpers y utilidades |
| `src/types/` | 📝 TypeScript definitions |
| `assets/` | 🎨 Imágenes y fonts |

<details>
<summary>Ver árbol completo</summary>
```
beatly/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx
│   │   ├── search.tsx
│   │   └── library.tsx
│   ├── album/[id].tsx
│   ├── artist/[id].tsx
│   └── playlist/[id].tsx
├── src/
│   ├── components/
│   │   ├── features/
│   │   └── shared/
│   ├── hooks/
│   ├── context/
│   ├── utils/
│   └── types/
└── assets/
```
</details>

---

## Autor

**Tu Nombre**
- GitHub: [@MaxiR23](https://github.com/MaxiR23)
- Email: maximilianorebolo@gmail.com

---

## Agradecimientos
- Inspiración de diseño: Spotify, Apple Music
- Comunidad de React Native y Expo
---

<div align="center">
  <strong>Hecho con ❤️ y mucha música 🎵</strong>
</div>
