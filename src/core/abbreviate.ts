/**
 * Abbreviate a fully-qualified class name by shortening each package segment to
 * its first letter while keeping the simple class name: `java.lang.String` ->
 * `j.l.String`. Names without a package are returned unchanged.
 */
export function abbreviate(fqcn: string): string {
  const parts = fqcn.split('.');
  if (parts.length <= 1) return fqcn;
  const simple = parts[parts.length - 1];
  const pkg = parts
    .slice(0, -1)
    .map((segment) => segment.charAt(0))
    .join('.');
  return `${pkg}.${simple}`;
}
