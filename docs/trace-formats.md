# Trace Formats

## JDK 9 and newer

ClassLoadGrapher uses unified JVM logging with both load and resolution events:

```text
-Xlog:class+resolve=debug,class+load=info:file=classload.txt
```

A load event provides a class name, timestamp, and source:

```text
[0.098s][info ][class,load] com.example.Main source: file:/work/app.jar
```

A resolution event provides a directed relationship:

```text
[0.104s][debug][class,resolve] com.example.Main java.lang.String Main.java:12
```

This means `com.example.Main` resolved `java.lang.String`; it does not imply
inheritance or a method call.

## JDK 8 and earlier

Legacy traces generated with `-XX:+TraceClassResolution` are supported when a
line begins with `RESOLVE`:

```text
RESOLVE com.example.Main java.lang.String Main.java:12
```

Legacy traces generally contain less load-source metadata, so explicit
`--app-prefix` hints are more important.

## Deduplication

Repeated `from -> to` pairs become one model edge with an occurrence count.
Distinct directed pairs are retained. Array targets are omitted to match the
behavior of the original ClassLoadGrapher.

## Generated classes

The JVM may report names such as:

- `Outer$Inner`: named inner class
- `Outer$1`: anonymous class
- `Outer$$Lambda/0x...`: runtime-generated hidden lambda class

Exact names remain in report data. The UI supplies stable readable labels and
groups related classes under the outer type.
