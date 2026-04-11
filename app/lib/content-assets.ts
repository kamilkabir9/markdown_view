function isAbsoluteAssetUrl(src: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('/');
}

function normalizeSegments(segments: string[]): string[] {
  const normalized: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      normalized.pop();
      continue;
    }

    normalized.push(segment);
  }

  return normalized;
}

export function resolveContentAssetUrl(documentSourcePath: string, src?: string): string | undefined {
  if (!src) return undefined;
  if (isAbsoluteAssetUrl(src)) return src;

  const documentSegments = documentSourcePath.split('/').filter(Boolean);
  const assetSegments = src.split('/').filter(Boolean);
  const baseSegments = documentSegments.slice(0, -1);
  const resolvedSegments = normalizeSegments([...baseSegments, ...assetSegments]);

  return `/content/${resolvedSegments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}
