/** The package of a fully-qualified class name (`''` for the default package). */
export function packageOf(fqcn: string): string {
  const lastDot = fqcn.lastIndexOf('.');
  return lastDot === -1 ? '' : fqcn.slice(0, lastDot);
}

/** Stable id for a collapsed package node. */
export function packageNodeId(pkg: string): string {
  return `pkg:${pkg}`;
}

/** Namespace prefixes from broadest to the complete package. */
export function namespacePrefixes(pkg: string): string[] {
  if (!pkg) return [''];
  const parts = pkg.split('.');
  return parts.map((_, index) => parts.slice(0, index + 1).join('.'));
}

export function parentNamespace(pkg: string): string | null {
  const separator = pkg.lastIndexOf('.');
  return separator === -1 ? null : pkg.slice(0, separator);
}

/** Map a class to the deepest namespace currently opened by the user. */
export function visibleUnitId(fqcn: string, expanded: Set<string>): string {
  const pkg = packageOf(fqcn);
  const prefixes = namespacePrefixes(pkg);
  for (const prefix of prefixes) {
    if (!expanded.has(prefix)) return packageNodeId(prefix);
  }
  return fqcn;
}

/** Owning top-level type for inner, anonymous, and generated nested classes. */
export function outerClassOf(fqcn: string): string {
  const pkg = packageOf(fqcn);
  const simpleName = fqcn.slice(pkg ? pkg.length + 1 : 0);
  const outerName = simpleName.split('$', 1)[0];
  return pkg ? `${pkg}.${outerName}` : outerName;
}

export function typeNodeId(fqcn: string): string {
  return `type:${outerClassOf(fqcn)}`;
}
