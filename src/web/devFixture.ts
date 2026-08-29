import type { EmbeddedData } from '../core/types';

/** Used only by `vite dev`, when no real data has been injected. */
export const devFixture: EmbeddedData = {
  graph: {
    classes: ['java.lang.Object', 'java.lang.String', 'java.io.PrintStream', 'app.Main'],
    edges: [
      {
        from: 'app.Main',
        to: 'java.lang.String',
        timestampMs: 12,
        sourceFile: 'Main.java',
        sourceLine: 8,
      },
      {
        from: 'app.Main',
        to: 'java.io.PrintStream',
        timestampMs: 14,
        sourceFile: 'Main.java',
        sourceLine: 11,
      },
      {
        from: 'java.lang.String',
        to: 'java.lang.Object',
        timestampMs: 16,
        sourceFile: 'String.java',
        sourceLine: 242,
      },
    ],
    classInfo: {
      'app.Main': {
        name: 'app.Main',
        origin: 'application',
        source: 'file:/work/build/classes/',
        timestampMs: 4,
      },
      'java.lang.Object': {
        name: 'java.lang.Object',
        origin: 'system',
        source: 'shared objects file',
        timestampMs: 1,
      },
      'java.lang.String': {
        name: 'java.lang.String',
        origin: 'system',
        source: 'shared objects file',
        timestampMs: 2,
      },
      'java.io.PrintStream': {
        name: 'java.io.PrintStream',
        origin: 'system',
        source: 'jrt:/java.base',
        timestampMs: 3,
      },
    },
  },
  opts: { abbreviate: false, filter: null },
};
