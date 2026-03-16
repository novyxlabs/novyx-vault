import { PROVIDER_PRESETS } from "./providers";

const ALLOWED_HOSTS = new Set(
  PROVIDER_PRESETS.map((p) => {
    try {
      return new URL(p.baseURL).hostname;
    } catch {
      return "";
    }
  }).filter(Boolean)
);

const PRIVATE_IP_RE =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.)/;

function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RE.test(ip)
    || ip === "::1" || ip === "[::1]"
    || ip === "0.0.0.0"
    || ip.startsWith("fc") || ip.startsWith("fd")
    || ip.startsWith("fe80");
}

/**
 * Resolve a hostname and verify none of its addresses are private.
 * Call this at request time (after validateProviderBaseURL passes) to catch
 * DNS rebinding attacks (e.g. 127.0.0.1.nip.io, attacker-controlled DNS).
 * Returns null if safe, or an error message if blocked.
 */
export async function resolveAndValidateHost(baseURL: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    return "Invalid provider URL";
  }

  const host = parsed.hostname;

  // Skip DNS check for known provider hosts and localhost
  if (ALLOWED_HOSTS.has(host) || host === "localhost" || host === "127.0.0.1") {
    return null;
  }

  try {
    const dns = await import("dns");
    const { resolve4, resolve6 } = dns.promises;

    // Check both A and AAAA records
    const [v4Result, v6Result] = await Promise.allSettled([
      resolve4(host),
      resolve6(host),
    ]);

    const addresses: string[] = [];
    if (v4Result.status === "fulfilled") addresses.push(...v4Result.value);
    if (v6Result.status === "fulfilled") addresses.push(...v6Result.value);

    // If DNS returned no records at all, block
    if (addresses.length === 0) {
      return "Could not resolve provider hostname";
    }

    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        return "Provider hostname resolves to a private network address";
      }
    }
  } catch {
    // DNS resolution failed — block as a precaution
    return "Could not resolve provider hostname";
  }

  return null;
}
