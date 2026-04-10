# Feature: Dominant Color Extraction

## Contexto

Las cards del Home (Featured Release, Listen Again, Stats) y las top bars colapsadas de las pantallas de detalle (Album, Artist, Playlist, Replay) ahora extraen el color dominante de la imagen para usarlo como fondo dinámico en vez de colores hardcodeados.

Se usa `react-native-image-colors` que wrappea APIs nativas de cada plataforma:
- **Android**: `Palette` class
- **iOS**: `UIImageColors`
- **Web**: `node-vibrant`

> SEE: https://github.com/osamaqarem/react-native-image-colors

---

## Instalación

```bash
npx expo install react-native-image-colors
```

Es un módulo nativo. Después de instalar se requiere rebuild:

```bash
# Android (local)
npx expo run:android

# iOS (CI/CD) — el workflow existente ya cubre esto:
# npx expo prebuild --platform ios → pod install → xcodebuild
```

> `npx expo start` NO alcanza. Metro no puede cargar módulos nativos nuevos sin recompilar el binario.

---

## Hook reutilizable

### `hooks/use-image-dominant-color.ts`

> SEE: https://github.com/osamaqarem/react-native-image-colors#api

| Return | Tipo | Descripción |
|---|---|---|
| `color` | `string` | Color dominante hex (`#1a1a1a` por defecto) |
| `isLight` | `boolean` | `true` si la luminancia > 0.65 (para ajustar color de texto) |

Uso:

```typescript
const { color, isLight } = useImageDominantColor(imageUrl);
```

Internamente:
- **Android**: usa `dominant` del resultado
- **iOS**: usa `background` del resultado
- **Cache built-in**: `cache: true` + `key: imageUrl` evita re-descargar la misma imagen
- **Fallback**: `#1a1a1a` si falla la extracción

La función `isLightColor` usa la fórmula de luminancia percibida (ITU-R BT.601):

```
luminance = (0.299 * R + 0.587 * G + 0.114 * B) / 255
```

---

## Componente compartido

### `components/shared/DynamicCoverCard.tsx`

Card reutilizable con cover de álbum + footer con color dominante dinámico.

| Prop | Tipo | Descripción |
|---|---|---|
| `thumbnailUrl` | `string \| null` | URL de la imagen |
| `label` | `string` | Label superior (ej: "NEW RELEASE", "LISTEN AGAIN") |
| `title` | `string` | Título principal (nombre del álbum) |
| `subtitle` | `string` | Subtítulo (nombre del artista) |
| `onPress` | `() => void` | Callback al presionar |
| `width` | `number` | Ancho de la card |
| `height` | `number` | Alto de la card |

Comportamiento:
- `backgroundColor` de la card = color dominante
- Imagen cuadrada arriba (`aspectRatio: 1`)
- Gradient de 8px difumina el borde inferior de la imagen hacia el color
- Si `isLight` es `true`, los textos cambian a negro/gris oscuro para mantener contraste

---

## Archivos modificados

### Frontend

| Archivo | Qué cambió |
|---|---|
| `hooks/use-image-dominant-color.ts` | **NUEVO** — Hook reutilizable para extracción de color |
| `components/shared/DynamicCoverCard.tsx` | **NUEVO** — Card compartida con color dinámico |
| `components/features/home/HomeFeatured.tsx` | Eliminadas `FeaturedReleaseCard` y `ListenAgainCard` duplicadas, reemplazadas por `DynamicCoverCard`. `StatsCard` usa color dominante del primer artista para el gradient |
| `components/shared/AnimatedDetailHeader.tsx` | Nuevo prop `dominantColor?`. Cuando se pasa, la top bar colapsada usa ese color de fondo en vez del `BlurView` genérico |
| `components/shared/AnimatedHeader.tsx` | Mismo cambio que `AnimatedDetailHeader` |
| `screens/AlbumScreen.tsx` | Extrae color con `useImageDominantColor(coverUrl)` y lo pasa a `AnimatedDetailHeader` |
| `screens/ArtistScreen.tsx` | Extrae color con `useImageDominantColor(heroUrl)` y lo pasa a `AnimatedHeader` |
| `screens/PlaylistScreen.tsx` | Extrae color con `useImageDominantColor(mosaicImages[0])` y lo pasa a `AnimatedDetailHeader` |
| `screens/ReplayScreen.tsx` | Extrae color con `useImageDominantColor(mosaicImages[0])` y lo pasa a `AnimatedDetailHeader` |
| `types/music.ts` | Agregados campos faltantes a `Artist`: `upcoming_album?`, `upcoming_events?`, `has_more?` |

---

## Patrón de uso en pantallas de detalle

El color se extrae en el **padre** (Screen) y se pasa como prop al header. Esto permite reutilizar el color para otros elementos en el futuro (fondo de pantalla, botones, etc.) sin duplicar la extracción.

```
Screen (extrae color una vez)
  ├── AnimatedDetailHeader (recibe dominantColor → top bar)
  ├── Fondo de pantalla (futuro)
  └── Botones / accents (futuro)
```

---

## Decisiones de diseño

| Decisión | Razón |
|---|---|
| Color en el frontend, no backend | Sin tocar DB, cron ni backend. Cache built-in de la lib. Reutilizable en cualquier componente |
| `background` en iOS vs `dominant` en Android | `background` es el color que Apple usa internamente (Apple Music style). `dominant` es el equivalente en Android Palette |
| Luminancia > 0.65 como umbral de "light" | Valor estándar para garantizar contraste WCAG con texto blanco |
| `DynamicCoverCard` en shared | Evita duplicación entre Featured y ListenAgain. Extensible para futuras cards |
| Gradient de 8px en `coverFade` | Suficiente para suavizar la transición imagen → color sin tapar el artwork |
| `StatsCard` gradient → negro | El color dominante del primer artista va a negro diagonal, dando profundidad sin perder legibilidad |

---

## Pendiente

| Qué | Detalle |
|---|---|
| Fondo de pantallas de detalle | Usar `dominantColor` com background gradient de la pantalla completa, no solo la top bar |
| MiniPlayer | Probar color dominante en el MiniPlayer (requiere matchear con ExpandedPlayer para transición coherente) |
| ExpandedPlayer | Reemplazar el gradient determinístico de `colorUtils.native.ts` por color real extraído con esta lib |