import type { ColorStats } from './pixelMath';

export interface WorkerAnalysisResult {
  sharpnessRaw: number;
  tileSharpnessRaw: number[];
  shadowClipping: number;
  highlightClipping: number;
  meanLuminance: number;
  hash: bigint;
  colorStats: ColorStats;
  motionBlurRatio: number;
}

interface PendingJob {
  resolve: (result: WorkerAnalysisResult) => void;
  reject: (err: Error) => void;
}

const MAX_WORKERS = 4;

let workers: Worker[] = [];
let nextWorkerIndex = 0;
let nextJobId = 0;
const pending = new Map<number, PendingJob>();

export function isWorkerAnalysisSupported(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap !== 'undefined'
  );
}

function ensurePool(): Worker[] {
  if (workers.length > 0) return workers;

  const count = Math.max(1, Math.min(MAX_WORKERS, navigator.hardwareConcurrency || 2));
  for (let i = 0; i < count; i++) {
    const worker = new Worker(new URL('../workers/analysisWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      const { id, error, ...result } = e.data;
      const job = pending.get(id);
      if (!job) return;
      pending.delete(id);
      if (error) job.reject(new Error(error));
      else job.resolve(result as WorkerAnalysisResult);
    };
    worker.onerror = () => {
      // A worker-level (not job-level) error; nothing to resolve here —
      // in-flight jobs on this worker will simply never respond and the
      // caller is responsible for its own timeout/fallback if desired.
    };
    workers.push(worker);
  }
  return workers;
}

/** Runs the sharpness/exposure/hash analysis for one photo in a pooled Web Worker. */
export function analyzeInWorker(url: string): Promise<WorkerAnalysisResult> {
  const pool = ensurePool();
  const worker = pool[nextWorkerIndex % pool.length];
  nextWorkerIndex++;
  const id = nextJobId++;

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, url });
  });
}

/** Terminates all pooled workers, e.g. when starting a fresh analysis run isn't needed but is available for cleanup. */
export function terminateWorkerPool(): void {
  for (const worker of workers) worker.terminate();
  workers = [];
  pending.clear();
}
