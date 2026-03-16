import { NextRequest } from "next/server";
import OpenAI from "openai";
import { validateProviderBaseURL } from "@/lib/providers";
import { resolveAndValidateHost } from "@/lib/providers.server";
import { getStorageContext } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await getStorageContext(); // auth check
    const { baseURL, apiKey, model } = await req.json();

    if (!baseURL || !model) {
      return Response.json({ ok: false, error: "Missing baseURL or model" });
    }

    const urlError = validateProviderBaseURL(baseURL);
    if (urlError) {
      return Response.json({ ok: false, error: urlError });
    }

    const dnsError = await resolveAndValidateHost(baseURL);
    if (dnsError) {
      return Response.json({ ok: false, error: dnsError });
    }

    const isLocal = baseURL.includes("localhost") || baseURL.includes("127.0.0.1");
    if (!isLocal && !apiKey) {
      return Response.json({ ok: false, error: "No API key" });
    }

    const isAnthropic = baseURL.includes("anthropic.com");
    const defaultHeaders: Record<string, string> = {};
    if (isAnthropic) {
      defaultHeaders["anthropic-version"] = "2023-06-01";
    }

    const client = new OpenAI({
      apiKey: apiKey || "not-needed",
      baseURL,
      defaultHeaders,
    });

    const response = await client.chat.completions.create({
      model,
      max_tokens: 5,
      messages: [{ role: "user", content: "Hi" }],
    });

    if (response.choices?.[0]) {
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: "No response from model" });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof OpenAI.APIError) {
      let hint = "";
      if (err.status === 401) hint = "Invalid API key";
      else if (err.status === 403) hint = "Key doesn't have access to this model";
      else if (err.status === 404) hint = "Model not found";
      else hint = `Error ${err.status}`;
      return Response.json({ ok: false, error: hint });
    }
    return Response.json({ ok: false, error: "Connection failed" });
  }
}
