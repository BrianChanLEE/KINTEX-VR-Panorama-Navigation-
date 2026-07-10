export function resolveAssetPath(rawPath: string) {
  if (!rawPath) return rawPath;

  if (
    rawPath.startsWith("http://") ||
    rawPath.startsWith("https://") ||
    rawPath.startsWith("data:") ||
    rawPath.startsWith("blob:")
  ) {
    return encodeURI(rawPath);
  }

  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  if (typeof window !== "undefined" && window.location?.origin) {
    return encodeURI(new URL(normalizedPath, window.location.origin).toString());
  }

  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return encodeURI(`${normalizedBase}${normalizedPath.replace(/^\//, "")}`);
}
