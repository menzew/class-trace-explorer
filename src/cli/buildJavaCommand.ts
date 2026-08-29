const XLOG_TAGS = 'class+resolve=debug,class+load=info';

/** The unified-logging flag that writes the resolution trace to `path`. */
export function xlogArg(path: string): string {
  return `-Xlog:${XLOG_TAGS}:file=${path}`;
}

export interface JavaRunOptions {
  tracePath: string;
  jar?: string;
  classpath?: string;
  rest?: string[];
}

/**
 * Assemble the argument list for the `java` launcher. Order: xlog flag, then a
 * `-jar`/`-cp` invocation (if given), then any raw passthrough args.
 */
export function buildJavaArgs(opts: JavaRunOptions): string[] {
  const rest = opts.rest ?? [];
  const invocation: string[] = [];
  if (opts.classpath) invocation.push('-cp', opts.classpath);
  if (opts.jar) invocation.push('-jar', opts.jar);
  invocation.push(...rest);

  if (invocation.length === 0) {
    throw new Error(
      'Nothing to run. Provide --jar <jar>, a main class via --cp <classpath> <Main>, ' +
        "or '-- <java args>'.",
    );
  }
  return [xlogArg(opts.tracePath), ...invocation];
}
