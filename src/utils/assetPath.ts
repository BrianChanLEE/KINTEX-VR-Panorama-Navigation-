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

  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;

  // Note: `/mice/...`, `/convention_kor/...` 같은 앱 내부 정적 자산은
  // 배포 base 경로를 따라가야 GitHub Pages 하위 경로와 로컬 개발 서버 둘 다에서
  // 동일하게 동작합니다.
  if (rawPath.startsWith("/mice/") || rawPath.startsWith("/convention_kor/")) {
    return encodeURI(`${normalizedBase}${normalizedPath}`);
  }

  return encodeURI(`${normalizedBase}${normalizedPath}`);
}
