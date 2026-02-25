/**
 * Convierte milisegundos a formato legible (mm:ss o hh:mm:ss)
 * 
 * @param ms - Milisegundos a convertir
 * @returns String formateado como "3:45" o "1:23:45"
 * 
 * @example
 * formatDuration(185000) // "3:05"
 * formatDuration(3665000) // "1:01:05"
 */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Convierte un string de duración (mm:ss o hh:mm:ss) a milisegundos
 * 
 * @param duration - String de duración en formato "mm:ss" o "hh:mm:ss"
 * @returns Milisegundos, o 0 si el formato es inválido
 * 
 * @example
 * parseDurationToMs("3:45") // 225000
 * parseDurationToMs("1:23:45") // 5025000
 * parseDurationToMs("--:--") // 0
 */
export function parseDurationToMs(duration?: string): number {
  if (!duration || duration === "--:--") return 0;
  
  const parts = duration.split(":").map((n) => parseInt(n, 10) || 0);
  
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return (h * 3600 + m * 60 + s) * 1000;
  }
  
  const [m, s] = parts;
  return (m * 60 + s) * 1000;
}

/**
 * Formatea información de fecha/hora de un evento
 * 
 * @param event - Objeto de evento con información de fecha/hora
 * @returns String formateado con fecha, hora y timezone
 * 
 * @example
 * formatEventDateTime({ start: { localDate: "2024-12-25", localTime: "20:00", timezone: "EST" }})
 * // "2024-12-25 20:00 • EST"
 */
export function formatEventDateTime(event: any): string {
  const date = event?.start?.localDate || "";
  const time = event?.start?.localTime || "";
  const timezone = event?.start?.timezone ? ` • ${event.start.timezone}` : "";
  
  return `${date}${time ? ` ${time}` : ""}${timezone}`;
}

/**
 * Convierte milisegundos a un formato de duración más legible para mostrar
 * Ejemplo: "3 min 45 seg" o "1 h 23 min"
 * 
 * @param ms - Milisegundos a convertir
 * @returns String formateado de manera legible
 * 
 * @example
 * formatDurationReadable(185000) // "3 min 5 seg"
 * formatDurationReadable(3665000) // "1 h 1 min"
 */
export function formatDurationReadable(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  
  if (h > 0) {
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  }
  
  if (m > 0) {
    return s > 0 ? `${m} min ${s} seg` : `${m} min`;
  }
  
  return `${s} seg`;
}

/**
 * Opciones para formatear duración de manera customizable
 */
export type DurationFormat = 'clock' | 'compact' | 'full';

export interface DurationOptions {
  /** Formato de salida: 'clock' (3:45), 'compact' (3h 45min), 'full' (3 h 45 min) */
  format?: DurationFormat;
  /** Redondear al minuto más cercano (ignora segundos) */
  round?: boolean;
  /** Mostrar segundos (solo aplica si round=false) */
  showSeconds?: boolean;
}

/**
 * Formatea duración con opciones personalizables y reutilizables
 * 
 * @param ms - Milisegundos a convertir
 * @param options - Opciones de formato
 * @returns String formateado según las opciones
 * 
 * @example
 * // Formato reloj (default)
 * formatDurationCustom(185000) // "3:05"
 * formatDurationCustom(3665000) // "1:01:05"
 * 
 * // Formato compacto sin redondeo
 * formatDurationCustom(185000, { format: 'compact' }) // "3min 5s"
 * formatDurationCustom(3665000, { format: 'compact' }) // "1h 1min 5s"
 * 
 * // Formato compacto redondeado (para playlists)
 * formatDurationCustom(261170000, { format: 'compact', round: true }) // "4h 22min"
 * formatDurationCustom(3570000, { format: 'compact', round: true }) // "1h"
 * formatDurationCustom(2700000, { format: 'compact', round: true }) // "45min"
 * 
 * // Formato completo
 * formatDurationCustom(185000, { format: 'full' }) // "3 min 5 seg"
 * formatDurationCustom(3665000, { format: 'full' }) // "1 h 1 min 5 seg"
 * 
 * // Sin segundos
 * formatDurationCustom(3665000, { format: 'compact', showSeconds: false }) // "1h 1min"
 */
export function formatDurationCustom(ms: number, options: DurationOptions = {}): string {
  const {
    format = 'clock',
    round = false,
    showSeconds = true
  } = options;

  if (!ms || ms <= 0) {
    return format === 'clock' ? '0:00' : '0min';
  }

  // Modo redondeado (para totales de playlists)
  if (round) {
    const totalMinutes = Math.round(ms / 60000);
    
    if (totalMinutes < 60) {
      return format === 'compact' ? `${totalMinutes}min` : `${totalMinutes} min`;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (format === 'compact') {
      return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;
    }
    
    return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
  }

  // Modo preciso (sin redondear)
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  // Formato reloj (3:45 o 1:01:05)
  if (format === 'clock') {
    if (h > 0) {
      return showSeconds 
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${h}:${String(m).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // Formato compacto (3h 45min 5s)
  if (format === 'compact') {
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}min`);
    if (showSeconds && s > 0) parts.push(`${s}s`);
    
    return parts.length > 0 ? parts.join(' ') : '0s';
  }

  // Formato completo (3 h 45 min 5 seg)
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} h`);
  if (m > 0) parts.push(`${m} min`);
  if (showSeconds && s > 0) parts.push(`${s} seg`);
  
  return parts.length > 0 ? parts.join(' ') : '0 seg';
}