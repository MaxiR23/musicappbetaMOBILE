// src/utils/duration.ts

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