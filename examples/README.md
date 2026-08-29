# Examples

The commands below assume `npm ci`, `npm run build`, and a JDK are available.
Generated reports are stored in `docs/examples/reports` so each example can be
opened directly after cloning. They embed all graph data and are marked as
generated files for GitHub language statistics.

Open the [example gallery](../docs/index.html) for links to all three interactive
reports. GitHub's file viewer shows HTML source rather than executing it, so use
a local checkout or the manually deployed GitHub Pages site for the full UI.

| Example         | Classes | Directed edges | Report                                                  |
| --------------- | ------: | -------------: | ------------------------------------------------------- |
| HelloWorld      |     265 |            473 | [Open report](../docs/examples/reports/helloworld.html) |
| SwingSet3       |   3,349 |         14,069 | [Open report](../docs/examples/reports/swingset.html)   |
| Apache NetBeans |   9,805 |         55,616 | [Open report](../docs/examples/reports/netbeans.html)   |

Counts reflect the checked-in captures and can vary with JDK or application
versions.

The reports also demonstrate class-file footprint enrichment. Coverage for
application and dependency classes is 100% in HelloWorld, 97.8% in SwingSet3,
and 98.3% in NetBeans. JDK module and generated classes remain unmeasured rather
than being counted as zero; see [Bytecode footprint](../docs/bytecode-footprint.md).

## HelloWorld

```bash
mkdir -p /tmp/clg-hello
javac -d /tmp/clg-hello examples/helloworld/HelloWorld.java
node dist/cli/bin.js run docs/examples/reports/helloworld \
  --cp /tmp/clg-hello example.HelloWorld
```

This is the smallest example and demonstrates the boundary between one
application class and the JDK runtime.

## SwingSet3

Download a SwingSet3 executable JAR separately; third-party binaries are not
stored in this repository. With the JAR at `/path/to/swingset.jar`:

```bash
timeout 30s node dist/cli/bin.js run docs/examples/reports/swingset \
  --jar /path/to/swingset.jar
```

SwingSet opens a GUI, so headless environments can use `xvfb-run`. Allow enough
startup time for demos and look-and-feel classes to load before stopping it.

## Apache NetBeans

Download and unpack an Apache NetBeans binary distribution. Start it with a
temporary profile and class logging:

```bash
timeout 35s xvfb-run -a /path/to/netbeans/bin/netbeans \
  --userdir /tmp/netbeans-clg-user \
  --cachedir /tmp/netbeans-clg-cache \
  --nosplash \
  -J-Xlog:class+resolve=debug,class+load=info:file=/tmp/netbeans-classload.txt

node dist/cli/bin.js graph /tmp/netbeans-classload.txt \
  docs/examples/reports/netbeans \
  --app-prefix org.netbeans \
  --app-prefix org.openide
```

NetBeans is a useful stress test for namespace aggregation, inner-class
grouping, filtering, and large-graph rendering.

## Data sensitivity

Reports embed class names, local paths, source locations, and load timing.
Inspect generated HTML before sharing it outside your organization.
