import sys

path = sys.argv[1]
content = open(path).read()

old = '    var duration: TimeInterval {\n        if let seconds = currentItem?.asset.duration.seconds, !seconds.isNaN {\n            return seconds\n        }\n        else if let seconds = currentItem?.duration.seconds, !seconds.isNaN {\n            return seconds\n        }\n        else if let seconds = currentItem?.seekableTimeRanges.last?.timeRangeValue.duration.seconds,\n                !seconds.isNaN {\n            return seconds\n        }\n        return 0.0\n    }'

new = '    var duration: TimeInterval {\n        let raw: Double\n        if let s = currentItem?.duration.seconds, !s.isNaN { raw = s }\n        else if let s = currentItem?.asset.duration.seconds, !s.isNaN { raw = s }\n        else if let s = currentItem?.seekableTimeRanges.last?.timeRangeValue.duration.seconds, !s.isNaN { raw = s }\n        else { return 0.0 }\n        return raw > 0 ? raw / 2.0 : 0.0\n    }'

if old not in content:
    print("ERROR: bloque no encontrado")
    sys.exit(1)

open(path, "w").write(content.replace(old, new, 1))
print("Patch aplicado OK")