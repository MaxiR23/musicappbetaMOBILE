# useSegments Migration — Props-based Tab Context

## Problema

Al compartir una screen entre múltiples tabs (ej: `PlaylistScreen` usada desde `explore/genre-playlist/[id]` y `library/playlist/[id]`), `useSegments()` de Expo Router devuelve los segmentos de la **ruta activa global**, no de la ruta que montó el componente. Al cambiar de tab, los segments cambiaban, re-disparaban effects, y hacían requests con el contexto equivocado.

### Síntomas observados

- `PlaylistScreen`: al entrar a una genre playlist en explore y cambiar al tab library, `isGenrePlaylist` pasaba a `false`, el effect se re-disparaba, y llamaba a `GET /api/playlists/{id}` con un ID de genre playlist → **500 Internal Server Error** (`PGRST116: The result contains 0 rows`).
- `AlbumScreen` / `ArtistScreen`: potencial de navegar a rutas incorrectas al cambiar de tab, porque `currentTab` se recalculaba con los segments del tab nuevo.

## Causa raíz

`useSegments()` es un hook global que refleja el estado de navegación actual, no el estado del componente que lo consume. Cuando se usa la misma screen en múltiples tabs via re-export, el componente sigue montado pero los segments apuntan al tab que tiene foco.

**Antes (patrón problemático):**
```tsx
// explore/genre-playlist/[id].tsx
export { default } from '@/screens/PlaylistScreen';

// PlaylistScreen.tsx
const segments = useSegments();
const isGenrePlaylist = segments.includes('genre-playlist'); // cambia al switchear tabs
```

## Solución

Pasar el contexto de tab como **prop desde el archivo de ruta** al componente screen. Cada ruta le dice a la screen qué es al montarla, el valor es fijo y no cambia con la navegación.

**Después:**
```tsx
// explore/genre-playlist/[id].tsx
import PlaylistScreen from '@/screens/PlaylistScreen';
export default function GenrePlaylistRoute() {
  return <PlaylistScreen isGenrePlaylist />;
}

// PlaylistScreen.tsx
interface PlaylistScreenProps {
  isGenrePlaylist?: boolean;
}
export default function PlaylistScreen({ isGenrePlaylist = false }: PlaylistScreenProps) {
  // isGenrePlaylist es fijo, no se recalcula
}
```

## Archivos modificados

### Screens (eliminaron `useSegments`)

| Screen | Prop agregado | Default |
|--------|---------------|---------|
| `PlaylistScreen.tsx` | `isGenrePlaylist?: boolean` | `false` |
| `AlbumScreen.tsx` | `currentTab?: 'home' \| 'search'` | `'home'` |
| `ArtistScreen.tsx` | `currentTab?: 'home' \| 'search'` | `'home'` |
| `ArtistReleasesScreen.tsx` | `currentTab?: 'home' \| 'search'` | `'home'` |

### Rutas (pasan el prop)

| Archivo de ruta | Prop pasado |
|-----------------|-------------|
| `explore/genre-playlist/[id].tsx` | `isGenrePlaylist` |
| `library/playlist/[id].tsx` | *(sin prop, default)* |
| `home/album/[id].tsx` | `currentTab="home"` |
| `search/album/[id].tsx` | `currentTab="search"` |
| `home/artist/[id].tsx` | `currentTab="home"` |
| `search/artist/[id].tsx` | `currentTab="search"` |
| `home/artist/[id]/releases.tsx` | `currentTab="home"` |
| `search/artist/[id]/releases.tsx` | `currentTab="search"` |

### No modificado

| Archivo | Razón |
|---------|-------|
| `TrackActionsSheet.tsx` | Es un modal, no una screen. Cuando está abierto el usuario no puede cambiar de tab, los segments son correctos en ese momento. |
| `ReplayScreen.tsx` | No usa `useSegments`. |

## Impacto

- Genre playlists ya no causan 500 al cambiar de tab
- Navegación intra-tab (albums, artists, releases) mantiene el tab correcto
- Cada screen funciona independientemente con múltiples instancias simultáneas
- Zero dependencia de timing de navegación

## Para nuevas screens

Si creás una screen compartida entre tabs:

1. **Nunca uses `useSegments()` para determinar el contexto de la screen**
2. Definí un prop (`currentTab`, `isGenrePlaylist`, etc.) con default seguro
3. Pasalo desde el archivo de ruta
4. `useSegments` sigue siendo válido para: auth guards, analytics globales, modals

## Referencias

- **Expo Router — Shared Routes (actualizado abril 2025)**:
  Documenta el patrón de re-exportar componentes entre tabs y el uso de grupos con rutas compartidas.
  https://docs.expo.dev/router/advanced/shared-routes/

- **Expo Router — Nesting Navigators (actualizado febrero 2026)**:
  Patrón de Stack dentro de Tab y navegación entre screens anidadas.
  https://docs.expo.dev/router/advanced/nesting-navigators/

- **Expo Router — Common Navigation Patterns (actualizado febrero 2026)**:
  Stacks dentro de tabs como patrón recomendado para apps con múltiples niveles de navegación por tab.
  https://docs.expo.dev/router/basics/common-navigation-patterns/

- **Expo Router API Reference — useSegments**:
  Documenta que `useSegments` devuelve los segmentos de la ruta activa actual, no de la ruta que montó el componente.
  https://docs.expo.dev/versions/latest/sdk/router/