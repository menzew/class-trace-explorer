# Security Policy

## Supported versions

Security fixes are applied to the latest 2.x release.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for the repository. Do not open a
public issue containing exploit details or sensitive traces.

ClassLoadGrapher processes local text traces and generates HTML containing
captured class names, paths, and source locations. Treat generated reports as
potentially sensitive artifacts and review them before sharing.

The generated report does not require a server and does not intentionally make
network requests. Third-party Java applications used for examples are not part
of ClassLoadGrapher and retain their own licenses and security policies.
