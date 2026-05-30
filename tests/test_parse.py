#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Tests for class-resolution trace parsing (legacy + unified logging)."""
from __future__ import print_function, absolute_import, division

from classloadgrapher.clgrapher import parse_resolve_line


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
