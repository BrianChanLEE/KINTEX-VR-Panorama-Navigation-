const baseUrl = import.meta.env.BASE_URL || "/";

export function resolveAssetPath(path: string) {
  if (!path) return path;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  return `${normalizedBase}${normalizedPath}`;
}
