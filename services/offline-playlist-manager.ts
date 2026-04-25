import { upsertOfflineTrack } from "@/lib/offlineItems";
import {
  getFailedTrackIdsForPlaylist,
  getOfflinePlaylist,
  getOkTrackIdsForPlaylist,
  linkTrackToPlaylist,
  OfflinePlaylistKind,
  setOfflinePlaylistStatus,
  upsertOfflinePlaylist,
} from "@/lib/offlinePlaylists";
import { OfflineDownloadMeta, offlineService } from "@/services/offline-service";

const CONCURRENCY = 2;

export interface OfflinePlaylistMeta {
  playlist_id: string;
  kind: OfflinePlaylistKind;
  name: string;
  thumbnail_url: string;
}

export interface OfflinePlaylistState {
  status: "idle" | "queued" | "downloading" | "done" | "error" | "cancelled";
  completed: number;
  failed: number;
  total: number;
  progress: number;
}

const INITIAL_STATE: OfflinePlaylistState = {
  status: "idle",
  completed: 0,
  failed: 0,
  total: 0,
  progress: 0,
};

type Listener = (state: OfflinePlaylistState) => void;

interface Job {
  meta: OfflinePlaylistMeta;
  tracks: OfflineDownloadMeta[];
  cancelled: boolean;
  controller: AbortController;
}

class OfflinePlaylistManager {
  private states = new Map<string, OfflinePlaylistState>();
  private subscribers = new Map<string, Set<Listener>>();
  private queue: Job[] = [];
  private currentJob: Job | null = null;

  getState(playlistId: string): OfflinePlaylistState {
    return this.states.get(playlistId) ?? INITIAL_STATE;
  }

  subscribe(playlistId: string, listener: Listener): () => void {
    let set = this.subscribers.get(playlistId);
    if (!set) {
      set = new Set();
      this.subscribers.set(playlistId, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.subscribers.delete(playlistId);
    };
  }

  private setState(playlistId: string, patch: Partial<OfflinePlaylistState>) {
    const prev = this.states.get(playlistId) ?? INITIAL_STATE;
    const next = { ...prev, ...patch };
    this.states.set(playlistId, next);
    const listeners = this.subscribers.get(playlistId);
    if (listeners) listeners.forEach((l) => l(next));
  }

  enqueue(meta: OfflinePlaylistMeta, tracks: OfflineDownloadMeta[]): void {
    if (!tracks.length) return;

    // Idempotente: si ya esta activa o encolada, no duplicamos.
    const existing = this.states.get(meta.playlist_id);
    if (existing && (existing.status === "downloading" || existing.status === "queued")) {
      return;
    }

    // Si hay un job activo de esta misma playlist (por ej. recien cancelada y
    // todavia esta terminando de abortar), no encolamos: esperamos a que muera.
    if (this.currentJob && this.currentJob.meta.playlist_id === meta.playlist_id) {
      return;
    }

    const job: Job = {
      meta,
      tracks,
      cancelled: false,
      controller: new AbortController(),
    };
    this.queue.push(job);

    this.setState(meta.playlist_id, {
      status: "queued",
      completed: 0,
      failed: 0,
      total: tracks.length,
      progress: 0,
    });

    this.processNext();
  }

  cancel(playlistId: string): void {
    // Cancelar desde la cola (todavia no arranco).
    const idx = this.queue.findIndex((j) => j.meta.playlist_id === playlistId);
    if (idx !== -1) {
      this.queue[idx].cancelled = true;
      this.queue[idx].controller.abort();
      this.queue.splice(idx, 1);
      this.setState(playlistId, { status: "cancelled" });
      this.states.delete(playlistId);
      return;
    }
    // Cancelar el job activo: aborta los downloads en vuelo.
    if (this.currentJob && this.currentJob.meta.playlist_id === playlistId) {
      this.currentJob.cancelled = true;
      this.currentJob.controller.abort();
    }
  }

  private async processNext(): Promise<void> {
    if (this.currentJob) return;
    const job = this.queue.shift();
    if (!job) return;
    if (job.cancelled) {
      this.processNext();
      return;
    }

    this.currentJob = job;
    try {
      await this.runJob(job);
    } catch (err) {
      console.warn("[offlinePlaylistManager] job failed:", err);
      this.setState(job.meta.playlist_id, { status: "error" });
    } finally {
      this.currentJob = null;
      this.processNext();
    }
  }

  private async runJob(job: Job): Promise<void> {
    const { meta, tracks } = job;
    const nowIso = new Date().toISOString();

    await upsertOfflinePlaylist({
      playlist_id: meta.playlist_id,
      kind: meta.kind,
      status: "pending",
      name: meta.name,
      thumbnail_url: meta.thumbnail_url,
      downloaded_at: nowIso,
      updated_at: nowIso,
    });

    this.setState(meta.playlist_id, {
      status: "downloading",
      completed: 0,
      failed: 0,
      total: tracks.length,
      progress: 0,
    });

    let completedCount = 0;
    let failedCount = 0;

    const trackQueue = tracks.map((t, idx) => ({ track: t, position: idx }));
    let cursor = 0;

    const worker = async () => {
      while (!job.cancelled) {
        const next = cursor < trackQueue.length ? trackQueue[cursor++] : null;
        if (!next) break;

        try {
          // Skip si ya esta descargado (evita re-bajar al reintentar).
          const already = await offlineService.isDownloaded(next.track.track_id);
          if (already) {
            // Aseguramos el link en la playlist por si no estaba.
            await linkTrackToPlaylist(
              meta.playlist_id,
              next.track.track_id,
              next.position,
              "ok"
            );
            // Aseguramos el row de offline_tracks (idempotente).
            await upsertOfflineTrack({
              track_id: next.track.track_id,
              title: next.track.title,
              artists: JSON.stringify(next.track.artists),
              album: next.track.album,
              album_id: next.track.album_id,
              thumbnail_url: next.track.thumbnail_url,
              duration_seconds: next.track.duration_seconds,
              downloaded_at: new Date().toISOString(),
            });
            completedCount++;
          } else {
            await offlineService.download(next.track, undefined, job.controller.signal);
            await linkTrackToPlaylist(
              meta.playlist_id,
              next.track.track_id,
              next.position,
              "ok"
            );
            completedCount++;
          }
        } catch (err: any) {
          // Si fue aborto, salimos sin marcar como failed.
          if (err?.message === "aborted" || job.cancelled) {
            break;
          }

          console.warn(
            `[offlinePlaylistManager] Track ${next.track.track_id} failed:`,
            err
          );

          // Stub para respetar la FK en offline_tracks. Envuelto en try
          // para que un fallo de SQLite no mate al worker entero.
          try {
            await upsertOfflineTrack({
              track_id: next.track.track_id,
              title: next.track.title,
              artists: JSON.stringify(next.track.artists),
              album: next.track.album,
              album_id: next.track.album_id,
              thumbnail_url: next.track.thumbnail_url,
              duration_seconds: next.track.duration_seconds,
              downloaded_at: new Date().toISOString(),
            });
            await linkTrackToPlaylist(
              meta.playlist_id,
              next.track.track_id,
              next.position,
              "failed"
            );
          } catch (innerErr) {
            console.warn(
              `[offlinePlaylistManager] Could not record failure for ${next.track.track_id}:`,
              innerErr
            );
          }
          failedCount++;
        }

        this.setState(meta.playlist_id, {
          completed: completedCount,
          failed: failedCount,
          progress: (completedCount + failedCount) / tracks.length,
        });
      }
    };

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);

    if (job.cancelled) {
      this.setState(meta.playlist_id, { status: "cancelled" });
      return;
    }

    await setOfflinePlaylistStatus(meta.playlist_id, "done");
    this.setState(meta.playlist_id, { status: "done", progress: 1 });
  }

  // Rehidrata desde DB cuando no hay state en memoria (primer montaje del hook).
  async hydrateFromDb(playlistId: string): Promise<void> {
    if (this.states.has(playlistId)) return;
    const row = await getOfflinePlaylist(playlistId);
    if (!row) return;
    if (row.status === "done") {
      const okIds = await getOkTrackIdsForPlaylist(playlistId);
      const failedIds = await getFailedTrackIdsForPlaylist(playlistId);
      const next: OfflinePlaylistState = {
        status: "done",
        completed: okIds.length,
        failed: failedIds.length,
        total: okIds.length + failedIds.length,
        progress: 1,
      };
      this.states.set(playlistId, next);
      const listeners = this.subscribers.get(playlistId);
      if (listeners) listeners.forEach((l) => l(next));
    }
    // Si esta en "pending" sin job activo -> quedo a medias de una sesion anterior.
    // Se deja en idle para que el user pueda reintentar con un nuevo enqueue.
  }
}

export const offlinePlaylistManager = new OfflinePlaylistManager();