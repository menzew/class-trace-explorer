/** The package of a fully-qualified class name (`''` for the default package). */
export function packageOf(fqcn: string): string {
  const lastDot = fqcn.lastIndexOf('.');
  return lastDot === -1 ? '' : fqcn.slice(0, lastDot);
}

/** Stable id for a collapsed package node. */
export function packageNodeId(pkg: string): string {
  return `pkg:${pkg}`;
}
