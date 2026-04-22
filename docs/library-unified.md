# Biblioteca unificada

## Contexto

Antes del refactor, la pantalla Library del app consumía **tres providers separados**:

- `PlaylistsProvider` — playlists propias (vía `useHomePlaylists`)
- `LibraryProvider` — saved albums y playlists de terceros (vía `useLibrary`)
- `LikesProvider` — tracks likeados (sigue vivo, no se toca)

La pantalla **armaba la grilla a mano** concatenando las fuentes:

```typescript
[likedItem, ...ownedPlaylists, ...mappedAlbums, ...mappedExternalPlaylists]
```

Resultado: orden fijo (no por recientes), tres caches separados que se desincronizaban, y cada mutación invalidaba solo su slice.

El refactor unifica todo en **un solo provider** que consume el endpoint `GET /api/library` del backend. La grilla llega ya ordenada y normalizada.

> DOC: [React — Context API](https://react.dev/reference/react/createContext)

---

## Arquitectura

```
App
├── LikesProvider          ← intacto, maneja likes de tracks
└── LibraryViewProvider    ← NUEVO: grilla unificada
        ↓
   libraryService.getView()
        ↓
   GET /api/library?sort=recents
```

El `LibraryViewProvider` reemplaza a `LibraryProvider` + `PlaylistsProvider`. Ambos borrados. `LikesProvider` queda como estaba porque los tracks likeados son otro dominio (SQLite local, sync delta, etc.).

---

## Componentes nuevos

### `services/libraryService.ts`

- `getView(version)` — consume `GET /api/library`, cachea con `library-view:list`.
- `add(payload)` / `remove(kind, externalId)` — mutaciones sobre saved items, invalidan prefix `library-view`.

### `context/LibraryViewContext.ts`

Expone el shape del context: `viewItems`, slices derivados (`ownedPlaylists`, `savedAlbums`, `savedPlaylists`), queries (`isInLibrary`), mutations (`addToLibrary`, `removeFromLibrary`), y `refresh`.

### `providers/LibraryViewProvider.tsx`

Provider único con:

- Fetch inicial vía `libraryService.getView()`.
- Optimistic updates con **mutation queue por `(kind, external_id)`** para evitar race conditions.
- Rollback automático si la mutación falla.
- Listener a `onPlaylistChange` → refresh cuando se crea/edita/borra una playlist.
- Listener a `onLikesChange` → refresh cuando cambia la colección de likes (actualiza el count de Liked en la grilla).
- Listener a `AppState "active"` → refresh al volver de background.

### `hooks/use-library-view.ts`

Hook consumer del context. Reemplaza a `useLibrary` y `useHomePlaylists`.

### `utils/likes-events.ts`

Event emitter (`emitLikesChange` / `onLikesChange`) que permite que el `LibraryViewProvider` reaccione a mutaciones de likes sin acoplarse a `LikesProvider`. Mismo patrón que `playlist-events.ts`.

---

## Invariante "Liked primera"

La Liked siempre va en la primera posición de la grilla, sin importar el modo de orden. El backend la devuelve así, pero durante **optimistic updates** en el front hay que respetarla también. Se implementa con un helper:

```typescript
function insertAfterLiked(
  items: LibraryViewItem[],
  item: LibraryViewItem,
): LibraryViewItem[] {
  const likedIndex = items.findIndex((i) => i.kind === "liked");
  if (likedIndex === -1) return [item, ...items];
  return [
    ...items.slice(0, likedIndex + 1),
    item,
    ...items.slice(likedIndex + 1),
  ];
}
```

Usado en `addToLibrary` (insertar el stub optimistic) y en `removeFromLibrary` (rollback cuando falla la red).

---

## Cache unificado en el front

| Cache key | Qué guarda | Se limpia cuando |
|---|---|---|
| `library-view:list` | Grilla unificada completa | Cualquier mutación: crear/editar/borrar playlist, add/remove a library, like/unlike |
| `playlist:{id}` | Detalle de una playlist con tracks | Editar la playlist, add/remove tracks |
| `playlist:liked` | Detalle de la Liked con tracks | Like/unlike de cualquier track |

El viejo cache `playlists:list` fue eliminado.

---

## Invalidación cruzada de caches

Cada mutación llama a `cacheClearPrefix("library-view")` además de su prefix específico:

| Mutación | Servicio | Prefixes limpiados |
|---|---|---|
| Crear playlist | `musicService.createPlaylist` | `library-view` |
| Editar playlist | `musicService.updatePlaylist` | `playlist:{id}`, `library-view` |
| Borrar playlist | `musicService.deletePlaylist` | `playlist:{id}`, `library-view` |
| Add track | `musicService.addTrackToPlaylist` | `playlist:{id}`, `library-view` |
| Remove track | `musicService.removeTrackFromPlaylist` | `playlist:{id}`, `library-view` |
| Move track | `musicService.moveTrackInPlaylist` | `playlist:{id}`, `library-view` |
| Save album/playlist | `libraryService.add` | `library-view` |
| Unsave album/playlist | `libraryService.remove` | `library-view` |
| Like track | `likesService.like` | `playlist:liked`, `library-view`, emite `onLikesChange` |
| Unlike track | `likesService.unlike` | `playlist:liked`, `library-view`, emite `onLikesChange` |

---

## Flujo de sincronización

```
Usuario likea una track
  ↓
likesService.like()
  ├─ Optimistic: LikesProvider marca el corazón (instantáneo)
  ├─ SQLite local: upsertLike()
  ├─ POST /api/likes/ (backend invalida LIBRARY_VIEW server-side)
  ├─ cacheClearPrefix("playlist:liked")
  ├─ cacheClearPrefix("library-view")
  └─ emitLikesChange()
      ↓
  LibraryViewProvider escucha → refresh()
      ↓
  libraryService.getView() → cache miss → GET /api/library
      ↓
  Response con nuevo count → setViewItems → grilla actualizada
```

Ventana total: ~200-400ms. El corazón en la track se marca instantáneo (optimistic del LikesProvider), el count en la card de Liked tarda el round-trip.

---

## Archivos tocados

### Nuevos

```
src/
├── context/
│   └── LibraryViewContext.ts      ← shape del nuevo context
├── providers/
│   └── LibraryViewProvider.tsx    ← provider unificado
├── hooks/
│   └── use-library-view.ts        ← consumer
└── utils/
    └── likes-events.ts            ← event emitter para likes
```

### Modificados

```
src/
├── services/
│   ├── libraryService.ts          ← getView unificado
│   ├── likesService.ts            ← emit + invalida library-view
│   └── musicService.ts            ← borrado getPlaylists, invalida library-view
├── hooks/
│   └── use-music-api.ts           ← borrado getPlaylists
├── app/
│   └── _layout.tsx                ← tree de providers simplificado
├── app/(tabs)/library/
│   └── index.tsx                  ← LibraryScreen consume useLibraryView
└── app/(tabs)/*/album/[id].tsx    ← AlbumScreen usa useLibraryView
```

### Borrados

```
src/
├── context/
│   ├── LibraryContext.ts          ← ❌ absorbido por LibraryViewContext
│   └── PlaylistsContext.ts        ← ❌ absorbido por LibraryViewContext
├── providers/
│   ├── LibraryProvider.tsx        ← ❌
│   └── PlaylistsProvider.tsx      ← ❌
└── hooks/
    ├── use-library.ts             ← ❌ reemplazado por use-library-view
    └── use-home-playlists.ts      ← ❌ reemplazado por use-library-view
```

---

## Consumidores remanentes migrados

`useLibrary()` y `useHomePlaylists()` tenían consumidores externos. Se migraron a `useLibraryView()`:

| Archivo | Hook viejo | Hook nuevo |
|---|---|---|
| `LibraryScreen` | `useHomePlaylists` + `useLibrary` | `useLibraryView` |
| `AlbumScreen` | `useLibrary` | `useLibraryView` |

Los métodos expuestos (`isInLibrary`, `addToLibrary`, `removeFromLibrary`) mantienen **exactamente la misma firma**, los consumidores solo cambian el import.

---

## Decisión de diseño: provider único vs múltiples

Se evaluó mantener providers separados y llamar a `libraryService.getView()` directo desde `LibraryScreen`. Se descartó porque:

- `isInLibrary` se usa en pantallas de detalle (álbum, artista) — necesita estar en un provider, no en una pantalla.
- Los optimistic updates y el mutation queue son lógica compleja que no debería vivir en un componente.
- Un solo provider = una sola fuente de verdad = cero inconsistencia entre pantallas.

---

## Patrón event-emitter para sincronización

Los providers reaccionan a eventos globales en vez de estar acoplados entre sí. Mismo patrón usado para playlists (`playlist-events.ts`) y extendido a likes (`likes-events.ts`).

```typescript
// Emisor (en el service):
emitLikesChange();

// Consumidor (en otro provider):
useEffect(() => {
  const unsubscribe = onLikesChange(() => refreshRef.current());
  return unsubscribe;
}, [userId]);
```

Ventaja: services no saben nada de React, providers no se importan entre sí.

> DOC: [React — useEffect cleanup](https://react.dev/reference/react/useEffect#connecting-to-an-external-system)

---

## Testing manual — flujos para validar

1. Abrir tab Library → Liked primera, resto por recientes.
2. Crear playlist desde FAB → aparece inmediatamente en la grilla.
3. Entrar a un álbum → "Save" → volver a Library → aparece.
4. Volver al álbum → "Remove" → volver a Library → desaparece.
5. Likear una track desde el player → volver a Library → count de Liked sube.
6. Unlikear → count baja.
7. Editar título de una playlist → grilla se actualiza sin recargar.

> DOC: [React Native — Testing](https://reactnative.dev/docs/testing-overview)