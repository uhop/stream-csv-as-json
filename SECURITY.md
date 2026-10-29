# Security Policy

## Reporting a vulnerability

**Don't report security vulnerabilities through public GitHub issues, pull requests, or discussions.**

Report privately through GitHub's **[Private Vulnerability Reporting](https://github.com/uhop/stream-csv-as-json/security/advisories/new)** (the **Report a
vulnerability** button on the repository's **Security** tab). It opens a confidential advisory that only you and the maintainers can see.

If GitHub reporting isn't available to you, email the maintainer at **eugene.lazutkin@gmail.com** with `SECURITY` in the subject line. Don't disclose details
publicly until a fix is released.

A report includes:

- the affected versions and runtime,
- the component and its options &mdash; which entry point (`parser`, `asObjects`, `stringer`, `withParser`, or a file component) and which flags (`packStrings`,
  `streamStrings`, `separator`, `fieldPrefix`, `rowTerminator`),
- a description of the issue and its impact,
- steps to reproduce: a document fed through a documented pipeline, with the timings or the observed value,
- any suggested remediation.

## Scope

`stream-csv-as-json` turns CSV text into a token stream and back. It opens no network connections, spawns no processes, and touches no files except through the
file components under `stream-csv-as-json/file/`, which read or write the path your code hands them. Application code assembles every pipeline and supplies its
input.

**Intended input is data you own or trust** &mdash; exports, database dumps, logs, files your own systems produce. The library isn't designed for CSV from the
open internet or from untrusted users.

Hardening still matters within that contract, and two classes are in scope:

- **Disproportionate cost.** A crafted document that makes a documented component spend materially more than the bytes it carries &mdash; work that grows faster
  than the input does.
- **A contract violation.** A documented component producing a value its contract forbids, or performing an operation its caller didn't ask for.

## Out of scope

**Calling the API in a loop.** A proof of concept that drives a component's methods directly, or feeds it a document it was asked to process, and then reports
that _n_ operations take _n_ units of time describes the cost of work the caller chose. A report needs an attacker model: who supplies the bytes, through which
documented entry point, under what configuration, and what the attacker gains that the caller didn't already have.

**Memory proportional to the input.** Streaming bounds what the library holds at once; it doesn't bound what your service accepts. With `packStrings` on (the
default), the parser holds each field whole until the field ends, and `asObjects` holds the names from the header row. A document that occupies memory because
the client sent a field or a header that large is your input limit's concern.

**Keys named `__proto__`.** `asObjects` emits each header name as a key token and builds no object itself. What an assembler downstream does with a `__proto__`
key is that assembler's contract: the `stream-json` assemblers create an own data property, as `JSON.parse` does.

**Components from `stream-json`.** Filters, streamers, and assemblers that consume this package's tokens belong to `stream-json`. Report their issues through
[the stream-json security policy](https://github.com/uhop/stream-json/security/policy).

## Scoring

The base score for this package uses **`AV:L`**. `stream-csv-as-json` binds no network stack: a crafted document reaches a component as a buffer or a file, and
whether it arrived over a network is a property of your deployment. CVSS expresses that through the consumer's environmental metrics, outside the base vector. A
report submitted with `AV:N` is rescored to `AV:L` and handled as usual.

## Hardening already shipped

This package has no published advisories. Before reporting, check the [security advisories](https://github.com/uhop/stream-csv-as-json/security/advisories) for
a variant of a known issue.

## Supported versions

Fixes are released against the latest published version. Upgrade to the latest `stream-csv-as-json` release before reporting, and pin the fixed version once one
is available.

## Disclosure process

- We aim to acknowledge a report within a few business days.
- We work to a coordinated-disclosure timeline (up to 90 days by default) and keep you updated on progress toward a fix.
- With your permission, we credit reporters in the release notes and the advisory. We request a CVE through GitHub's CNA when we publish the advisory.

Thank you for helping keep the ecosystem safe.
