import { assertPublicTarget } from "./ssrfGuard";

const protocolByHost = new Map<string, "http:" | "https:">();
const PROTOCOL_PROBE_TIMEOUT_MS = 3_000;

export async function resolveProtocol(target: string): Promise<string> {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(target)) {
    return target;
  }

  const httpsTarget = new URL(`https://${target}`);
  const cachedProtocol = protocolByHost.get(httpsTarget.host);

  if (cachedProtocol) {
    httpsTarget.protocol = cachedProtocol;
    return httpsTarget.toString();
  }

  if (await isReachable(httpsTarget)) {
    protocolByHost.set(httpsTarget.host, "https:");
    return httpsTarget.toString();
  }

  httpsTarget.protocol = "http:";
  await assertPublicTarget(httpsTarget);
  protocolByHost.set(httpsTarget.host, "http:");

  return httpsTarget.toString();
}

async function isReachable(target: URL): Promise<boolean> {
  await assertPublicTarget(target);

  try {
    const response = await fetch(target, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(PROTOCOL_PROBE_TIMEOUT_MS),
    });

    return response.status > 0;
  } catch {
    return false;
  }
}
