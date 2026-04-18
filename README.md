# Beatly App Music 
> **Versión Test** · Streaming moderno de música con React Native

[![Version](https://img.shields.io/badge/version-test-orange)](/)
[![Android](https://img.shields.io/badge/Android-in%20testing-3DDC84)](/)
[![iOS](https://img.shields.io/badge/iOS-in%20testing-999999)](/)

**Beatly** es una app personal de streaming de música. Actualmente en fase de pruebas

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

**1) Clonar** el repositorio
```bash
git clone https://github.com/tu-usuario/beatly.git
cd beatly
```

**2) Instalar** dependencias
```bash
npm install  # o yarn install
```

**3) Configurar** variables de entorno

Crear `.env` en la raíz:
```env
EXPO_PUBLIC_API_URL=https://tu-backend.com/api
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

**4) Iniciar** el proyecto
```bash
npx expo start           # Desarrollo
npx expo start --ios     # iOS
npx expo start --android # Android
```

---

## Estructura del Proyecto

| Directorio | Descripción |
|-----------|-------------|
| `app/` | Screens con Expo Router (file-based) |
| `components/` | Componentes reutilizables (features + shared) |
| `hooks/` | Custom Hooks (music, api, cache) |
| `context/` | Context providers (Music, Auth) |
| `utils/` | Helpers y utilidades |
| `types/` | TypeScript definitions |
| `assets/` | Imágenes y fonts |

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

**Maxi Rebolo**
- GitHub: [@MaxiR23](https://github.com/MaxiR23)
- Email: maximilianorebolo@gmail.com

---
