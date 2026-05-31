#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Tests for class-resolution trace parsing (legacy + unified logging)."""
from __future__ import absolute_import, division, print_function

import pytest

from classloadgrapher.clgrapher import (
    ClassloadGrapher,
    abbreviate_class_name,
    parse_resolve_line,
)


def test_parses_unified_logging_java9_plus():
    line = ("[0.012s][debug][class,resolve] "
            "java.lang.String java.io.ObjectStreamField String.java:242")
    assert parse_resolve_line(line) == ("java.lang.String",
                                        "java.io.ObjectStreamField")


def test_parses_legacy_resolve_format():
    line = "RESOLVE java.lang.Object java.lang.System Hello.java:1"
    assert parse_resolve_line(line) == ("java.lang.Object", "java.lang.System")


def test_ignores_non_resolve_lines():
    assert parse_resolve_line("") is None
    assert parse_resolve_line(
        "[0.006s][info][class,load] java.lang.Object source: shared") is None
    assert parse_resolve_line("random text") is None


def test_abbreviates_package_but_not_class_name():
    assert abbreviate_class_name("java.lang.String") == "j.l.String"
    assert abbreviate_class_name("String") == "String"


def test_graph_keeps_distinct_edges_to_same_target(tmp_path):
    class Dot:
        def __init__(self):
            self.edges = []

        def edge(self, from_class, to_class):
            self.edges.append((from_class, to_class))

    trace = tmp_path / "trace.txt"
    trace.write_text(
        "\n".join([
            "RESOLVE a.A x.Target A.java:1",
            "RESOLVE b.B x.Target B.java:1",
            "RESOLVE b.B x.Target B.java:1",
            "RESOLVE c.C [Lx.Array C.java:1",
        ]),
        encoding="utf-8")

    dot = Dot()
    ClassloadGrapher().graphClassload(dot, str(trace), regex=None, abrv=False)

    assert dot.edges == [("a.A", "x.Target"), ("b.B", "x.Target")]


def test_no_args_exits_with_usage_error():
    with pytest.raises(SystemExit) as excinfo:
        ClassloadGrapher().main([])
    assert excinfo.value.code == 2
