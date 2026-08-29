# Class Origin Classification

Origin labels describe where a class came from; they do not indicate trust.

## System

Classes are classified as `SYSTEM` when their name or source identifies a JDK
runtime class, including common `java`, `javax`, `jdk`, `sun`, and `com.sun`
namespaces, the runtime image, or the shared-object archive.

## Application

`APP` is assigned from explicit evidence:

- package prefixes supplied with `--app-prefix`
- class directories or JAR paths supplied or inferred with `--app-source`

`clgrapher run` infers the launched JAR and non-JAR classpath directories where
possible. Imported traces should usually provide explicit hints.

## Dependency and unknown

A class loaded from a JAR that does not match application evidence is labeled
`DEPENDENCY`. A class without sufficient source or package evidence is
`UNKNOWN`.

Aggregated nodes containing more than one origin are labeled `MIXED`.

## Filtering behavior

Origin selections are staged and applied together. Excluded classes and their
rendered edges disappear from the canvas. Visible nodes retain total topology
counts and report how many incident relationships are hidden by filters.
