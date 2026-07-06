type HeaderReader = {
  get(name: string): string | null;
};

export function getClientIdentifier(headers: HeaderReader): string {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "local";
}
