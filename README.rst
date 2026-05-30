================
ClassloadGrapher
================

Is your Java program's startup too slow? have you wondered what classes are in
your metaspace? Well then, this tool can help provide the answer. It generates a
tree of your application's class hierarchy from the JVM's class-resolution trace.

Works with modern JDKs (Java 9 through Java 25+) which use unified logging
(``-Xlog``), and still understands the legacy ``-XX:+TraceClassResolution``
format from Java 8 and earlier.


=============
Requirements:
=============

* Python 3.7+
* The Graphviz ``dot`` binary on your ``PATH``
  (``apt install graphviz`` / ``brew install graphviz``)
* A JDK to trace (only needed for the ``run`` command below)

Install the Python dependencies (and, optionally, the ``clgrapher`` command)::

    % pip install .

You can also run it straight from a checkout without installing::

    % pip install graphviz
    % python -m classloadgrapher ...


=========================
To run (the easy way):
=========================

Let the tool launch your program with the right flags and produce the graph in
one step::

    % clgrapher run ~/MyClasses --jar your-app.jar

For a class on a classpath::

    % clgrapher run ~/MyClasses --cp build com.example.Main

Anything after ``--`` is passed straight to ``java``::

    % clgrapher run ~/MyClasses -- -jar your-app.jar --some-app-arg

This produces ``~/MyClasses.pdf``.


==================================
To run (from an existing trace):
==================================

Capture a trace yourself, then graph it. On Java 9+ (including Java 25)::

    % java -Xlog:class+resolve=debug:file=MyClassTrace.txt -jar your-app.jar
    % clgrapher graph MyClassTrace.txt ~/MyClasses

On Java 8 and earlier the legacy flags still work and are still understood::

    % java -XX:+TraceClassResolution -jar your-app.jar > MyClassTrace.txt
    % clgrapher graph MyClassTrace.txt ~/MyClasses

And in the same folder you will find ``~/MyClasses.pdf``.


=========
Options:
=========

* ``-abrv``    abbreviate package names, e.g. ``java.lang.`` -> ``j.l.``
* ``-f STR``   filter out classes whose name contains ``STR``
* ``--view``   open the generated PDF in a viewer when done

_____


==============
Sample output:
==============


.. image:: https://github.com/menzew/ClassLoadGrapher/blob/master/Sample-Screenshot.png
