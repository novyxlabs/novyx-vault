import { NextRequest } from "next/server";
import OpenAI, { toFile } from "openai";
import { getStorageContext } from "@/lib/auth";
import { validateProviderBaseURL } from "@/lib/providers";
import { resolveAndValidateHost } from "@/lib/providers.server";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

interface ProviderPayload {
  baseURL?: string;
  apiKey?: string;
  model?: string;
}

export async function POST(req: NextRequest) {
  let ctx;
  try { ctx = await getStorageContext(); } catch (e) { if (e instanceof Response) return e; throw e; }
  const rl = await checkRateLimit(getRateLimitKey("transcribe", ctx.userId, req), RATE_LIMITS.ai);
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid multipart form data" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const audioFile = formData.get("audio");
  const providerRaw = formData.get("provider");
  const providerBaseURL = formData.get("providerBaseURL") as string | null;
  const providerApiKey = formData.get("providerApiKey") as string | null;
  let provider: ProviderPayload | null = null;

  if (typeof providerRaw === "string") {
    try {
      provider = JSON.parse(providerRaw) as ProviderPayload;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid provider payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  if (!audioFile || !(audioFile instanceof Blob)) {
    return new Response(
      JSON.stringify({ error: "No audio file provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Limit file size to 25MB (OpenAI's Whisper limit)
  const MAX_SIZE = 25 * 1024 * 1024;
  if (audioFile.size > MAX_SIZE) {
    return new Response(
      JSON.stringify({ error: "Audio file too large. Maximum size is 25MB." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const baseURL = provider?.baseURL || providerBaseURL || "https://api.openai.com/v1";
  const apiKey = provider?.apiKey || providerApiKey;
  const model = provider?.model || "whisper-1";

  if (!apiKey) {
    const isLocal =
      baseURL.includes("localhost") || baseURL.includes("127.0.0.1");
    if (!isLocal) {
      return new Response(
        JSON.stringify({ error: "No API key configured for this provider" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const urlError = validateProviderBaseURL(baseURL);
  if (urlError) {
    return new Response(
      JSON.stringify({ error: urlError }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const dnsError = await resolveAndValidateHost(baseURL);
  if (dnsError) {
    return new Response(
      JSON.stringify({ error: dnsError }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = new OpenAI({
    apiKey: apiKey || "not-needed",
    baseURL,
  });

  try {
    // Convert the Blob to a File-like object for the OpenAI SDK
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const file = await toFile(audioBuffer, "audio.webm", {
      type: audioFile.type || "audio/webm",
    });

    const transcription = await client.audio.transcriptions.create({
      model,
      file,
    });

    return Response.json({ text: transcription.text });
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      console.error(
        `[Transcribe API] ${err.status} from ${baseURL}:`,
        err.message,
        err.error
      );
      return new Response(
        JSON.stringify({ error: `AI provider error (${err.status})` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error(`[Transcribe API] Error:`, err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: "Transcription request failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
