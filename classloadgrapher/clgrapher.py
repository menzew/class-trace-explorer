#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import absolute_import, division, print_function

import argparse
import logging
import os
import subprocess
import sys
import tempfile

from graphviz import Digraph

from classloadgrapher import __version__, template

# JVM flag that records class resolutions on JDK 9+ (including 25).
# The legacy -XX:+TraceClassResolution flag was removed by JEP 158
# (unified logging) and no longer exists.
XLOG_RESOLVE = "class+resolve=debug"


def parse_resolve_line(line):
    """Extract ``(from_class, to_class)`` from a class-resolution trace line.

    Two trace formats are supported:

    * Legacy ``-XX:+TraceClassResolution`` (JDK <= 8)::

          RESOLVE <from> <to> <source>

    * Unified logging ``-Xlog:class+resolve`` (JDK 9+, including 25)::

          [0.012s][debug][class,resolve] <from> <to> <source>

    Returns ``None`` for lines that are not class-resolution entries.
    """
    stripped = line.strip()
    if not stripped:
        return None

    if stripped.startswith("["):
        # Unified logging: strip the leading [..][..][class,resolve] tags.
        tag_end = stripped.rfind("]")
        if tag_end == -1:
            return None
        if "class,resolve" not in stripped[:tag_end + 1]:
            return None
        message = stripped[tag_end + 1:].strip()
    elif stripped.startswith("RESOLVE"):
        message = stripped[len("RESOLVE"):].strip()
    else:
        return None

    parts = message.split()
    if len(parts) < 2:
        return None
    return parts[0], parts[1]


class ClassloadGrapher:
    __author__ = "mzm"
    __copyright__ = "mzm"
    __license__ = "new-bsd"

    _logger = logging.getLogger(__name__)

    _legend = template.__template__

    def openFile(self, fname):
        try:
            _f = open(fname)
        except IOError as e:
            print("I/O error({0}) : {1}".format(e.errno, e.strerror))
            raise
        return _f

    def graphClassload(self, dot, fname, regex, abrv=True):
        sigs = set()

        _file = self.openFile(fname)

        for line in _file:
            parsed = parse_resolve_line(line)
            if parsed is None:
                continue

            from_class, to_class = parsed

            if (regex is not None):
                if (regex in from_class or regex in to_class):
                    continue

            abrv_from = ""
            abrv_to = ""

            sig = hash(from_class + to_class)
            toSig = hash(to_class)
            if (sig not in sigs and toSig not in sigs and '[' not in to_class):
                sigs.add(sig)
                sigs.add(toSig)
                if (abrv):
                    abrv_from_list = from_class.split(".")
                    for abrv_from_package in abrv_from_list:
                        abrv_from += abrv_from_package[:1] + '.'
                    abrv_to_list = to_class.split(".")
                    for abrv_to_package in abrv_to_list:
                        abrv_to += abrv_to_package[:1] + '.'
                    dot.edge(abrv_from + from_class.split(".")[-1], abrv_to + to_class.split(".")[-1])
                else:
                    dot.edge(from_class, to_class)
        _file.close()

    def addLegend(self, dot, template=_legend):
        subdot = Digraph('legend', node_attr={'shape': 'plaintext'})
        subdot.node('_legend', template)
        dot.subgraph(subdot)

    def render(self, dest, filter=None, abrv=False, view=False):
        """Build the class graph from a trace file and render it to ``dest``."""
        dot = Digraph(node_attr={'shape': 'plaintext'}, comment='Loaded Classes')
        self.graphClassload(dot, self._trace, filter, abrv)
        self.addLegend(dot)
        dot.render(dest, view=view)
        self._logger.info("Wrote %s.pdf", dest)

    def run_java(self, java_args, java="java", trace_file=None):
        """Run a Java program, capturing its class-resolution trace.

        ``java_args`` are passed verbatim to the ``java`` launcher (e.g.
        ``["-jar", "app.jar"]`` or ``["-cp", "build", "Main"]``). The correct
        unified-logging flag is injected automatically. Returns the path to the
        captured trace file.
        """
        if trace_file is None:
            handle, trace_file = tempfile.mkstemp(suffix=".clgrapher-trace.txt")
            os.close(handle)
            # Java unified logging archives an existing target to "<file>.0";
            # remove the placeholder so it writes a single fresh file.
            os.remove(trace_file)

        xlog = "-Xlog:{tags}:file={path}".format(tags=XLOG_RESOLVE, path=trace_file)
        cmd = [java, xlog] + list(java_args)
        self._logger.info("Running: %s", " ".join(cmd))

        try:
            returncode = subprocess.call(cmd)
        except OSError as e:
            raise SystemExit(
                "Could not launch '{java}': {err}".format(java=java, err=e))
        if returncode != 0:
            self._logger.warning(
                "Java process exited with code %s; graphing the trace captured so far",
                returncode)
        return trace_file

    def parse_args(self, args):
        """
        Parse command line parameters

        :param args: command line parameters as list of strings
        :return: command line parameters as :obj:`argparse.Namespace`
        """
        parser = argparse.ArgumentParser(
            description="A tool to make a graph of loaded classes in a jvm")
        parser.add_argument(
            '--version',
            action='version',
            version='Classload-Grapher {ver}'.format(ver=__version__))

        subparsers = parser.add_subparsers(dest="command")

        def add_common_options(p):
            p.add_argument(
                '-abrv',
                action='store_true',
                help="Abbreviate e.g. java.lang. -> j.l.")
            p.add_argument(
                '-f',
                dest="filter",
                help="Filter out classes whose name contains this string",
                type=str)
            p.add_argument(
                '--view',
                action='store_true',
                help="Open the generated PDF in a viewer (off by default)")
            p.add_argument(
                '-v',
                '--verbose',
                dest="loglevel",
                help="set loglevel to INFO",
                action='store_const',
                const=logging.INFO)
            p.add_argument(
                '-vv',
                '--very-verbose',
                dest="loglevel",
                help="set loglevel to DEBUG",
                action='store_const',
                const=logging.DEBUG)

        graph_parser = subparsers.add_parser(
            'graph',
            help="Generate a graph from an existing class-resolution trace file")
        graph_parser.add_argument(
            dest="raw",
            help="class load trace file",
            type=str,
            metavar="trace_file")
        graph_parser.add_argument(
            dest="dest",
            help="destination for generated file",
            type=str,
            metavar="destination_file")
        add_common_options(graph_parser)

        run_parser = subparsers.add_parser(
            'run',
            help="Run a Java program, capture its class-resolution trace, and graph it")
        run_parser.add_argument(
            dest="dest",
            help="destination for generated file",
            type=str,
            metavar="destination_file")
        run_parser.add_argument(
            '--jar',
            help="Run an executable jar (java -jar <jar>)",
            type=str)
        run_parser.add_argument(
            '--cp', '--classpath',
            dest="classpath",
            help="Classpath passed to java -cp",
            type=str)
        run_parser.add_argument(
            '--java',
            default="java",
            help="Path to the java launcher (default: java)")
        run_parser.add_argument(
            '--keep-trace',
            dest="keep_trace",
            help="Write the captured trace to this file and keep it",
            type=str)
        run_parser.add_argument(
            dest="java_args",
            nargs="*",
            metavar="java_args",
            help="Main class / args passed to java. Put option-like args after "
                 "'--', e.g. run out -- -jar app.jar --app-flag")
        add_common_options(run_parser)

        # Backwards compatibility: "clgrapher <trace> <dest>" (no subcommand)
        # still works by defaulting to the 'graph' subcommand.
        if args and args[0] not in ('graph', 'run', '-h', '--help', '--version'):
            args = ['graph'] + list(args)

        return parser.parse_args(args)

    def main(self, args):
        args = self.parse_args(args)
        logging.basicConfig(level=args.loglevel, stream=sys.stdout)
        self._logger.debug("Start graphing...")

        cleanup_trace = False
        if args.command == 'run':
            java_args = list(args.java_args)
            if java_args and java_args[0] == '--':
                java_args = java_args[1:]
            if args.classpath:
                java_args = ['-cp', args.classpath] + java_args
            if args.jar:
                java_args = ['-jar', args.jar] + java_args
            if not java_args:
                raise SystemExit(
                    "Nothing to run. Provide --jar <jar>, or a main class via "
                    "--cp <classpath> <Main>, or '-- <java args>'.")
            self._trace = self.run_java(java_args, java=args.java,
                                        trace_file=args.keep_trace)
            cleanup_trace = args.keep_trace is None
        else:
            self._trace = args.raw

        try:
            self.render(args.dest, filter=args.filter, abrv=args.abrv,
                        view=args.view)
        finally:
            if cleanup_trace:
                try:
                    os.remove(self._trace)
                except OSError:
                    pass
        self._logger.info("Ends here")

    def run(self):
        self.main(sys.argv[1:])

    def __init__(self):
        self.run()


def run():
    ClassloadGrapher()


if __name__ == "__main__":
    ClassloadGrapher()
