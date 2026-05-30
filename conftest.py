#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Root conftest.

Its presence makes pytest add the repository root to ``sys.path`` so the
``classloadgrapher`` package is importable when running ``pytest`` directly
(without installing the package first), as the CI workflow does.
"""
