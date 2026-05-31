import type { EmbeddedData } from '../core/types';

/** Used only by `vite dev`, when no real data has been injected. */
export const devFixture: EmbeddedData = {
  graph: {
    classes: ['java.lang.Object', 'java.lang.String', 'java.io.PrintStream', 'app.Main'],
    edges: [
      { from: 'app.Main', to: 'java.lang.String' },
      { from: 'app.Main', to: 'java.io.PrintStream' },
      { from: 'java.lang.String', to: 'java.lang.Object' },
    ],
  },
  opts: { abbreviate: false, filter: null },
};
