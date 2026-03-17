/**
 * Client-side local Whisper transcription using @huggingface/transformers.
 *
 * Uses Xenova/whisper-tiny.en (~40MB, English-only, fast).
 * The pipeline is loaded once per session and cached in a module-level variable.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pipeline = any;

let pipelineInstance: Pipeline | null = null;
let modelStatus: "idle" | "loading" | "ready" | "error" = "idle";
let progressCallback: ((progress: number) => void) | null = null;

const MODEL_ID = "Xenova/whisper-tiny.en";
const SAMPLE_RATE = 16000;

/**
 * Check whether the browser supports local Whisper transcription.
 * Requires WebAssembly and AudioContext.
 */
export function isLocalWhisperSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof WebAssembly !== "undefined" &&
    (typeof AudioContext !== "undefined" ||
      typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext !== "undefined")
  );
}

/**
 * Get the current model loading status for UI indicators.
 */
export function getModelStatus(): "idle" | "loading" | "ready" | "error" {
  return modelStatus;
}

/**
 * Register a callback to receive model download progress (0-100).
 */
export function onModelProgress(callback: (progress: number) => void): void {
  progressCallback = callback;
}

/**
 * Load the Whisper pipeline. Called automatically by transcribeLocal,
 * but can be called early to pre-warm the model.
 */
async function loadPipeline(): Promise<Pipeline> {
  if (pipelineInstance) return pipelineInstance;

  modelStatus = "loading";
  try {
    const { pipeline } = await import("@huggingface/transformers");
    pipelineInstance = await pipeline(
      "automatic-speech-recognition",
      MODEL_ID,
      {
        progress_callback: (data: { status?: string; progress?: number }) => {
          if (data.progress != null && progressCallback) {
            progressCallback(Math.round(data.progress));
          }
        },
      }
    );
    modelStatus = "ready";
    return pipelineInstance;
  } catch (err) {
    modelStatus = "error";
    console.error("[transcribe] Failed to load Whisper model:", err);
    throw new Error(
      "Failed to load local transcription model. Check your internet connection and try again."
    );
  }
}

/**
 * Convert an audio Blob to a Float32Array at 16kHz mono,
 * which is what Whisper expects.
 */
async function blobToFloat32(blob: Blob): Promise<Float32Array> {
  const AudioContextClass =
    typeof AudioContext !== "undefined"
      ? AudioContext
      : (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("AudioContext is not supported in this browser");
  }

  const audioCtx = new AudioContextClass({ sampleRate: SAMPLE_RATE });

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Mix down to mono if needed
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }

    const length = audioBuffer.length;
    const mono = new Float32Array(length);
    const channels = audioBuffer.numberOfChannels;

    for (let ch = 0; ch < channels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        mono[i] += channelData[i] / channels;
      }
    }

    return mono;
  } finally {
    await audioCtx.close();
  }
}

/**
 * Transcribe an audio Blob locally using Whisper.
 *
 * @param audioBlob - The audio to transcribe (webm, wav, mp3, etc.)
 * @returns The transcribed text
 */
export async function transcribeLocal(audioBlob: Blob): Promise<string> {
  if (!isLocalWhisperSupported()) {
    throw new Error(
      "Local transcription is not supported in this browser. WebAssembly and AudioContext are required."
    );
  }

  const transcriber = await loadPipeline();

  let audioFloat32: Float32Array;
  try {
    audioFloat32 = await blobToFloat32(audioBlob);
  } catch (err) {
    console.error("[transcribe] Audio decode failed:", err);
    throw new Error(
      "Failed to decode audio. The recording may be corrupted or in an unsupported format."
    );
  }

  if (audioFloat32.length === 0) {
    throw new Error("Audio recording is empty");
  }

  try {
    const result = await transcriber(audioFloat32, {
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    return (result.text as string).trim();
  } catch (err) {
    console.error("[transcribe] Transcription failed:", err);
    throw new Error("Transcription failed. Please try recording again.");
  }
}

/**
 * Free the cached pipeline to release memory.
 * Call when the user navigates away from voice features.
 */
export function cleanup(): void {
  pipelineInstance = null;
  modelStatus = "idle";
}
