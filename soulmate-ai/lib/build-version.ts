export function extractBuildDate(buildId: string): string {
  const match = buildId.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? buildId;
}

export function compareBuildVersions(left: string, right: string): number {
  const leftDate = extractBuildDate(left);
  const rightDate = extractBuildDate(right);

  if (leftDate < rightDate) return -1;
  if (leftDate > rightDate) return 1;
  return 0;
}

export function stripBuildQueryParams(url: URL) {
  url.searchParams.delete('v');
  url.searchParams.delete('fresh');
}

export function normalizeStaleBuildQuery(currentVersion: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const requestedBuild = url.searchParams.get('v');

  if (!requestedBuild || requestedBuild === currentVersion) {
    return;
  }

  if (compareBuildVersions(requestedBuild, currentVersion) > 0) {
    return;
  }

  stripBuildQueryParams(url);
  const nextPath = `${url.pathname}${url.search}${url.hash}`;
  const nextHref = `${url.origin}${nextPath}`;

  if (window.location.href === nextHref) {
    return;
  }

  window.history.replaceState({}, document.title, nextPath);

  if (new URL(window.location.href).searchParams.get('v') === requestedBuild) {
    window.location.replace(nextHref);
  }
}
