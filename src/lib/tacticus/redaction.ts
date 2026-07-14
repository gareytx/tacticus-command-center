const SECRET_HEADER =
  /^(authorization|proxy-authorization|x-api-key|api-key)$/i;
const CREDENTIAL_PATTERN =
  /(authorization\s*[:=]\s*[^,\s]+|x-api-key\s*[:=]\s*[^,\s]+)/gi;

export function redactHeaders(headers: Headers | Record<string, string>) {
  const entries =
    headers instanceof Headers
      ? [...headers.entries()]
      : Object.entries(headers);
  return Object.fromEntries(
    entries.map(([key, value]) => [
      key,
      SECRET_HEADER.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

export function redactCredential(value: string, secrets: string[] = []) {
  let result = value.replace(CREDENTIAL_PATTERN, "[REDACTED]");
  for (const secret of secrets.filter(Boolean))
    result = result.split(secret).join("[REDACTED]");
  return result;
}

export function maskIdentity(value: string | null | undefined) {
  if (!value) return "Not exposed by API";
  return value.length <= 4 ? `••••${value}` : `••••${value.slice(-4)}`;
}
