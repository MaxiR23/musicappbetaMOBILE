# iOS Duration Fix — SwiftAudioEx Patch

## Problema

En iOS, `useProgress().duration` de `react-native-track-player` reportaba el doble de la duración real para streams de audio fMP4 (ej: una canción de 3:40 aparecía como 7:19). Android no tenía este problema.

## Causa raíz

`SwiftAudioEx` (dependencia interna de RNTP) expone la duración a través de `AVURLAsset.duration` y `AVPlayerItem.duration`, ambos devuelven x2 para streams fMP4 fragmentados debido a un bug en cómo AVPlayer interpreta el container.

## Solución

Patch en build time sobre `AVPlayerWrapper.swift` de SwiftAudioEx vía GitHub Actions. El patch divide el valor de duración por 2 antes de exponerlo.

### Archivo patcheado
`ios/Pods/SwiftAudioEx/Sources/SwiftAudioEx/AVPlayerWrapper/AVPlayerWrapper.swift`

### Cambio aplicado

**Antes:**
```swift
var duration: TimeInterval {
    if let seconds = currentItem?.asset.duration.seconds, !seconds.isNaN {
        return seconds
    }
    else if let seconds = currentItem?.duration.seconds, !seconds.isNaN {
        return seconds
    }
    else if let seconds = currentItem?.seekableTimeRanges.last?.timeRangeValue.duration.seconds,
            !seconds.isNaN {
        return seconds
    }
    return 0.0
}
```

**Después:**
```swift
var duration: TimeInterval {
    let raw: Double
    if let s = currentItem?.duration.seconds, !s.isNaN { raw = s }
    else if let s = currentItem?.asset.duration.seconds, !s.isNaN { raw = s }
    else if let s = currentItem?.seekableTimeRanges.last?.timeRangeValue.duration.seconds, !s.isNaN { raw = s }
    else { return 0.0 }
    return raw > 0 ? raw / 2.0 : 0.0
}
```

### Script del patch
`.github/scripts/patch_duration.py`

### Workflow
`.github/workflows/build-ios.yml` — step: `Patch SwiftAudioEx - fix duration x2 for fMP4 streams`

## Impacto

- `useProgress().duration` ahora reporta la duración real en iOS
- Seek funciona correctamente
- Lockscreen y NowPlaying muestran la duración correcta
- Android no fue afectado

## Referencias

- **HLS Spec (Apple/IETF)**: El spec de HLS requiere que los fMP4 segments tengan `mvhd` y `tkhd` con duración cero, lo que hace que `AVURLAsset.duration` no pueda obtener la duración real del container.
  https://developer.apple.com/streaming/HLS-draft-pantos.pdf

- **Apple Developer Docs — AVURLAssetPreferPreciseDurationAndTimingKey**: Indica que la duración precisa no está garantizada por defecto para streams.
  https://developer.apple.com/documentation/avfoundation/avurlassetpreferprecisedurationandtimingkey