# Virtualización de Tracks en Playlists

## Qué es
FlatList solo renderiza los items visibles en pantalla + un buffer pequeño. Si tenés 500 canciones, solo renderiza ~15-20 a la vez, no las 500.

## Problema anterior
```typescript
// MAL: FlatList anidado con scrollEnabled={false}
sections = [
  { type: 'header' },
  { type: 'buttons' },
  { type: 'tracks', data: [500 tracks] } // Renderiza TODO
]
```
El FlatList anidado monta las 500 rows de una vez = lag brutal.

## Solución correcta
```typescript
// BIEN: Cada track es una section individual
sections = [
  { type: 'header' },
  { type: 'buttons' },
  { type: 'track', data: track1 },
  { type: 'track', data: track2 },
  // ... 500 tracks
]
```
FlatList principal solo renderiza los tracks visibles = scroll fluido.

## Diferencia clave
- **Antes**: Array de 3 sections, la última tiene 500 tracks anidados (renderiza todo)
- **Ahora**: Array de 502 sections (header + buttons + 500 tracks planos), virtualiza correctamente

## Resultado
Playlist de 500 canciones carga instantáneamente y scrollea fluido porque solo renderiza lo visible.
```