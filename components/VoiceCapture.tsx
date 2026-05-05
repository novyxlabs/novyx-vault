"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Loader2,
  X,
  Save,
  ArrowLeft,
  Sparkles,
  FileText,
  FolderOpen,
  Cloud,
  Cpu,
  Monitor,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadSettings, getActiveProvider } from "@/lib/providers";
import { buildCaptureNoteContent, buildCaptureNotePath } from "@/lib/capture";
import { transcribeLocal } from "@/lib/transcribe";

interface VoiceCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteSaved: (path: string) => void;
  notes: { name: string; path: string }[];
  onOpenSettings?: () => void;
}

type Phase = "record" | "transcribing" | "structuring" | "preview";
type TranscriptionMode = "local" | "cloud";
type AudioSource = "mic" | "system";

export default function VoiceCapture({
  isOpen,
  onClose,
  onNoteSaved,
  notes,
  onOpenSettings,
}: VoiceCaptureProps) {
  const [phase, setPhase] = useState<Phase>("record");
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>("local");
  const [audioSource, setAudioSource] = useState<AudioSource>("mic");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [structuredContent, setStructuredContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase("record");
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setMicError(null);
      setTranscript("");
      setTitle("");
      setStructuredContent("");
      setError(null);
      setIsSaving(false);
      chunksRef.current = [];
    }
  }, [isOpen]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopAllTracks();
      stopTimer();
      stopVisualization();
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Get AI provider
  const getProvider = useCallback(() => {
    const settings = loadSettings();
    return getActiveProvider(settings);
  }, []);

  const provider = getProvider();

  // Extract tags from the structured content for display
  const extractedTags =
    structuredContent
      .match(/#[a-z][a-z0-9-]*/g)
      ?.filter((tag, i, arr) => arr.indexOf(tag) === i) || [];

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const stopAllTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleClose = () => {
    stopAllTracks();
    stopTimer();
    stopVisualization();
    setIsRecording(false);
    setIsPaused(false);
    onClose();
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = 20;
      const gap = 3;
      const barWidth = (width - gap * (barCount - 1)) / barCount;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const barHeight = Math.max(4, value * height);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = "#f43f5e"; // rose-500
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();
  };

  const startRecording = async () => {
    setMicError(null);
    setError(null);
    chunksRef.current = [];

    try {
      let stream: MediaStream;

      if (audioSource === "system") {
        // System audio via getDisplayMedia — user picks a tab/window to capture audio from
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true, // Required by the API, but we only use the audio track
            audio: true,
          });
          // Stop the video track immediately — we only need audio
          stream.getVideoTracks().forEach((track) => track.stop());
          // Check if we actually got an audio track
          if (stream.getAudioTracks().length === 0) {
            setMicError("No audio track captured. Make sure you select a tab or window with audio enabled.");
            return;
          }
        } catch (err) {
          const message =
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Screen capture was cancelled. Select a browser tab or window to capture its audio."
              : (err as Error).message || "Failed to capture system audio";
          setMicError(message);
          return;
        }
      } else {
        // Microphone capture
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;

      // Set up audio analyser for waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Start waveform visualization
      drawWaveform();
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? audioSource === "system"
            ? "Screen capture access denied. Please allow screen sharing in your browser settings."
            : "Microphone access denied. Please allow mic access in your browser settings."
          : (err as Error).message || `Failed to access ${audioSource === "system" ? "system audio" : "microphone"}`;
      setMicError(message);
    }
  };

  const togglePause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (isPaused) {
      recorder.resume();
      setIsPaused(false);
      // Resume timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      // Resume visualization
      drawWaveform();
    } else {
      recorder.pause();
      setIsPaused(true);
      stopTimer();
      stopVisualization();
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        resolve(blob);
      };
      recorder.stop();
    });
  };

  const handleDone = async () => {
    stopTimer();
    stopVisualization();
    setIsRecording(false);
    setIsPaused(false);

    const audioBlob = await stopRecording();
    stopAllTracks();

    if (!audioBlob || audioBlob.size === 0) {
      setError("No audio recorded. Please try again.");
      return;
    }

    // Move to transcribing phase
    setPhase("transcribing");
    setError(null);

    try {
      let text: string;

      if (transcriptionMode === "local") {
        text = await transcribeLocal(audioBlob);
      } else {
        // Cloud transcription
        if (!provider) {
          setError("No AI provider configured. Switch to Local mode or configure a provider.");
          setPhase("record");
          return;
        }

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append(
          "provider",
          JSON.stringify({
            baseURL: provider.baseURL,
            apiKey: provider.apiKey,
            model: provider.model,
          })
        );

        const res = await fetch("/api/notes/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Transcription failed (${res.status})`);
        }

        text = data.transcript || data.text || "";
      }

      if (!text || text.trim().length === 0) {
        setError("No speech detected in the recording. Please try again.");
        setPhase("record");
        return;
      }

      setTranscript(text.trim());
      setPhase("structuring");
    } catch (err) {
      setError((err as Error).message || "Transcription failed");
      setPhase("record");
    }
  };

  const handleStructure = async () => {
    if (!provider) return;

    setPhase("structuring");
    setError(null);

    try {
      const existingNotes = notes.map((n) => n.name);

      const res = await fetch("/api/notes/voice-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          provider: {
            baseURL: provider.baseURL,
            apiKey: provider.apiKey,
            model: provider.model,
          },
          existingNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        setPhase("structuring");
        return;
      }

      setTitle(data.title);
      setStructuredContent(data.content);
      setPhase("preview");
    } catch (err) {
      setError((err as Error).message || "Failed to structure transcript");
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !structuredContent) return;

    setIsSaving(true);
    setError(null);

    try {
      const capturedAt = new Date();
      const fullContent = buildCaptureNoteContent({
        kind: "voice",
        title: title.trim(),
        content: structuredContent,
        capturedAt,
      });
      const notePath = buildCaptureNotePath("voice", title.trim(), capturedAt);

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: notePath,
          content: fullContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save note");
        setIsSaving(false);
        return;
      }

      onNoteSaved(notePath);
      handleClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save note");
      setIsSaving(false);
    }
  };

  const handleBackToTranscript = () => {
    setPhase("structuring");
    setError(null);
  };

  const handleBackToRecord = () => {
    setPhase("record");
    setError(null);
    setTranscript("");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Voice Capture"
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          const modal = e.currentTarget;
          const focusable = modal.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      }}
    >
      <div
        className="bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Mic size={16} className="text-rose-400" />
            <h2 className="text-sm font-medium">Voice Capture</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded text-muted hover:text-foreground transition-colors"
            aria-label="Close Voice Capture"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Phase 1: Record */}
          {phase === "record" && (
            <div className="ghost-fade-in flex flex-col gap-4 items-center">
              {/* Transcription mode toggle */}
              <div className="flex items-center gap-1 bg-card-bg border border-sidebar-border rounded-lg p-1 self-center">
                <button
                  onClick={() => setTranscriptionMode("local")}
                  aria-pressed={transcriptionMode === "local"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    transcriptionMode === "local"
                      ? "bg-rose-500/20 text-rose-300"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Cpu size={12} />
                  Local
                </button>
                <button
                  onClick={() => setTranscriptionMode("cloud")}
                  aria-pressed={transcriptionMode === "cloud"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    transcriptionMode === "cloud"
                      ? "bg-rose-500/20 text-rose-300"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Cloud size={12} />
                  Cloud
                </button>
              </div>

              {/* Audio source toggle */}
              <div className="flex items-center gap-1 bg-card-bg border border-sidebar-border rounded-lg p-1 self-center">
                <button
                  onClick={() => setAudioSource("mic")}
                  aria-pressed={audioSource === "mic"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    audioSource === "mic"
                      ? "bg-rose-500/20 text-rose-300"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Mic size={12} />
                  Microphone
                </button>
                <button
                  onClick={() => setAudioSource("system")}
                  aria-pressed={audioSource === "system"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    audioSource === "system"
                      ? "bg-rose-500/20 text-rose-300"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Monitor size={12} />
                  System Audio
                </button>
              </div>

              {audioSource === "system" && !isRecording && (
                <p className="text-[11px] text-muted text-center">
                  Captures audio from a browser tab — meetings, webinars, podcasts
                </p>
              )}

              {transcriptionMode === "local" && !isRecording && (
                <p className="text-[11px] text-muted text-center">
                  Local transcription downloads the Whisper model on first use; internet is needed for that first run.
                </p>
              )}

              {/* Provider warning for cloud mode */}
              {transcriptionMode === "cloud" && !provider && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg w-full">
                  <Sparkles size={14} className="text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-300 flex-1">
                    Add an AI provider to use Cloud transcription
                  </p>
                  {onOpenSettings && (
                    <button
                      onClick={() => {
                        handleClose();
                        onOpenSettings();
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium bg-rose-500/20 text-rose-300 rounded-md hover:bg-rose-500/30 transition-colors shrink-0"
                    >
                      Open Settings
                    </button>
                  )}
                </div>
              )}

              {/* Record button */}
              <div className="flex flex-col items-center gap-4 py-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="w-20 h-20 rounded-full bg-rose-600 hover:bg-rose-500 transition-all flex items-center justify-center shadow-lg hover:shadow-rose-500/25 hover:scale-105 active:scale-95"
                    aria-label={`Start ${audioSource === "system" ? "system audio" : "microphone"} recording`}
                  >
                    <Mic size={32} className="text-white" />
                  </button>
                ) : (
                  <div
                    className="w-20 h-20 rounded-full bg-rose-600 flex items-center justify-center shadow-lg animate-pulse"
                    role="status"
                    aria-label="Recording in progress"
                  >
                    <Mic size={32} className="text-white" />
                  </div>
                )}

                {!isRecording && !micError && (
                  <p className="text-xs text-muted">
                    Tap to start recording
                  </p>
                )}
              </div>

              {/* Waveform visualization */}
              {isRecording && (
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={60}
                  className="w-full h-[60px] rounded-lg"
                  aria-hidden="true"
                />
              )}

              {/* Duration timer */}
              {isRecording && (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-2xl font-mono text-foreground tabular-nums">
                    {formatDuration(duration)}
                  </span>

                  {/* Recording controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePause}
                      className="p-2.5 rounded-full bg-card-bg border border-sidebar-border text-foreground hover:bg-muted-bg transition-colors"
                      title={isPaused ? "Resume" : "Pause"}
                      aria-label={isPaused ? "Resume recording" : "Pause recording"}
                    >
                      {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                    <button
                      onClick={handleDone}
                      className="px-5 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-500 transition-colors flex items-center gap-2"
                    >
                      <Square size={14} />
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Mic error */}
              {micError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg w-full">
                  <MicOff size={14} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{micError}</p>
                </div>
              )}

              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 w-full">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Phase 2: Transcribing */}
          {phase === "transcribing" && (
            <div className="ghost-fade-in flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <Loader2 size={40} className="text-rose-400 animate-spin" />
              </div>
              <p className="text-sm text-muted">Transcribing...</p>
            </div>
          )}

          {/* Phase 3: Structuring */}
          {phase === "structuring" && (
            <div className="ghost-fade-in flex flex-col gap-4">
              {/* Raw transcript display */}
              <div>
                <label className="text-xs text-muted block mb-1.5">
                  Raw Transcript
                </label>
                <div className="w-full bg-card-bg border border-sidebar-border rounded-lg px-4 py-3 text-sm text-foreground leading-relaxed max-h-[30vh] overflow-y-auto">
                  {transcript}
                </div>
              </div>

              {!provider && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  <Sparkles size={14} className="text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-300 flex-1">
                    Add an AI provider to structure your transcript
                  </p>
                  {onOpenSettings && (
                    <button
                      onClick={() => {
                        handleClose();
                        onOpenSettings();
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium bg-rose-500/20 text-rose-300 rounded-md hover:bg-rose-500/30 transition-colors shrink-0"
                    >
                      Open Settings
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToRecord}
                  className="px-4 py-2 bg-muted-bg text-foreground rounded-lg text-sm hover:bg-muted-bg/80 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft size={14} />
                  Re-record
                </button>
                <button
                  onClick={handleStructure}
                  disabled={!provider || !transcript.trim()}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
                >
                  <Sparkles size={14} />
                  Structure with AI
                </button>
              </div>
            </div>
          )}

          {/* Phase 4: Preview & Save */}
          {phase === "preview" && (
            <div className="ghost-fade-in flex flex-col gap-4">
              {/* Title input */}
              <div>
                <label className="text-xs text-muted block mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-rose-500/50"
                />
              </div>

              {/* Folder input */}
              <div>
                <label className="text-xs text-muted flex items-center gap-1 mb-1.5">
                  <FolderOpen size={11} />
                  Vault Path
                </label>
                <div className="w-full bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-muted font-mono text-xs">
                  Captures/YYYY-MM-DD
                </div>
              </div>

              {/* Tags */}
              {extractedTags.length > 0 && (
                <div>
                  <label className="text-xs text-muted block mb-1.5">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Markdown preview */}
              <div>
                <label className="text-xs text-muted flex items-center gap-1 mb-1.5">
                  <FileText size={11} />
                  Preview
                </label>
                <div className="bg-card-bg border border-sidebar-border rounded-lg p-4 max-h-[35vh] overflow-y-auto">
                  <div className="markdown-preview text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {structuredContent
                        .replace(
                          /(?:^|\n)(?:#{0,6}\s*)?(?:#[a-z][a-z0-9-]*[\s,]*)+$/gm,
                          ""
                        )
                        .replace(/ #[a-z][a-z0-9-]*/g, "")
                        .trim()}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky action bar for preview phase */}
        {phase === "preview" && (
          <div className="px-5 py-3 border-t border-sidebar-border bg-sidebar-bg flex gap-2 shrink-0">
            <button
              onClick={handleBackToTranscript}
              className="flex-1 py-2 bg-muted-bg text-foreground rounded-lg text-sm hover:bg-muted-bg/80 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || isSaving}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save to Vault
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
