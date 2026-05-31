import { Command } from 'commander';

export interface ParsedArgs {
  command: 'graph' | 'run';
  dest: string;
  raw?: string; // graph: input trace file
  abbreviate: boolean;
  filter: string | null;
  view: boolean;
  jar?: string;
  classpath?: string;
  java: string;
  keepTrace?: string;
  javaArgs: string[];
}

const KNOWN_FIRST = new Set(['graph', 'run', '-h', '--help', '--version', '-V']);

/** Back-compat: bare `clgrapher <trace> <dest>` still means `graph <trace> <dest>`. */
export function normalizeArgv(argv: string[]): string[] {
  if (argv.length > 0 && !KNOWN_FIRST.has(argv[0])) return ['graph', ...argv];
  return argv;
}

export function parseArgs(argv: string[]): ParsedArgs {
  let parsed: ParsedArgs | null = null;
  const program = new Command();
  program.name('clgrapher').version('1.0.0', '-V, --version').exitOverride();

  const common = (cmd: Command): Command =>
    cmd
      .option('-abrv', 'abbreviate package names, e.g. java.lang. -> j.l.', false)
      .option('-f, --filter <str>', 'hide classes whose name contains this string')
      .option('--view', 'open the generated HTML in a browser', false);

  common(program.command('graph'))
    .argument('<trace_file>', 'class-resolution trace file')
    .argument('<destination>', 'destination file (.html appended if missing)')
    .action((traceFile: string, destination: string, opts: Record<string, unknown>) => {
      parsed = {
        command: 'graph',
        raw: traceFile,
        dest: destination,
        abbreviate: Boolean(opts.Abrv ?? opts.abrv),
        filter: (opts.filter as string) ?? null,
        view: Boolean(opts.view),
        java: 'java',
        javaArgs: [],
      };
    });

  common(program.command('run'))
    .argument('<destination>', 'destination file (.html appended if missing)')
    .option('--jar <jar>', 'run an executable jar (java -jar <jar>)')
    .option('--cp, --classpath <cp>', 'classpath passed to java -cp')
    .option('--java <path>', 'path to the java launcher', 'java')
    .option('--keep-trace <file>', 'write the captured trace here and keep it')
    .argument('[javaArgs...]', "main class / args; put option-like args after '--'")
    .action((destination: string, javaArgs: string[], opts: Record<string, unknown>) => {
      parsed = {
        command: 'run',
        dest: destination,
        abbreviate: Boolean(opts.Abrv ?? opts.abrv),
        filter: (opts.filter as string) ?? null,
        view: Boolean(opts.view),
        jar: opts.jar as string | undefined,
        classpath: opts.classpath as string | undefined,
        java: (opts.java as string) ?? 'java',
        keepTrace: opts.keepTrace as string | undefined,
        javaArgs: javaArgs ?? [],
      };
    });

  program.parse(normalizeArgv(argv), { from: 'user' });
  if (!parsed) throw new Error('No subcommand matched.');
  return parsed;
}
