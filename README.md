<div align="center">

# Jialiang Liang · `lux-liang`

**Open-source contributor · LLM / developer tooling · research engineering**

I turn reproducible bugs, rough edges, and research ideas into focused upstream changes.

<p>
  <a href="https://github.com/lux-liang?tab=repositories"><img src="https://img.shields.io/badge/Open%20source-upstream%20first-2ea44f?style=flat-square" alt="Open source"></a>
  <a href="https://github.com/lux-liang"><img src="https://img.shields.io/github/followers/lux-liang?label=Followers&style=flat-square" alt="GitHub followers"></a>
  <a href="https://github.com/lux-liang/lux-liang"><img src="https://img.shields.io/badge/Focus-Python%20%7C%20Go%20%7C%20Java%20%7C%20TS%20%7C%20Rust-8250df?style=flat-square" alt="Primary languages"></a>
</p>

</div>

## What I build

- **Reliable developer tools:** small, reviewable fixes with regression tests and clear reproduction steps.
- **LLM / agent systems:** repository exploration, context efficiency, and practical coding workflows.
- **Cross-language engineering:** Python, Go, Java, JavaScript/TypeScript, and Rust.

> **Contribution principle:** reproduce first, isolate the smallest safe change, test the boundary, and upstream the result.

## Selected open-source work

### Lead contributor · small contributor groups (≤5 contributors)

These are projects where the visible contributor group is small; I describe my role as **lead contributor** rather than project owner.

| Project | Stack | Selected upstream work |
| --- | --- | --- |
| [Gausian Native Editor](https://github.com/gausian-AI/Gausian_native_editor) | Rust | [#9](https://github.com/gausian-AI/Gausian_native_editor/pull/9) restored Windows compilation; [#10](https://github.com/gausian-AI/Gausian_native_editor/pull/10) fixed DNxHR proxy handling. |
| [ClaudeCode-Portable](https://github.com/techjarves/ClaudeCode-Portable) | JavaScript | [#43](https://github.com/techjarves/ClaudeCode-Portable/pull/43) fixed Firefox/CJK IME Enter-key submission behavior. |
| [Open DroneLog](https://github.com/arpanghosh8453/open-dronelog) | TypeScript | [#224](https://github.com/arpanghosh8453/open-dronelog/pull/224) fixed replay-range visualization and added a reproducible app demonstration. |
| [dsh-config-manager](https://github.com/xiajiajun516/dsh-config-manager) | TypeScript | [#44](https://github.com/xiajiajun516/dsh-config-manager/pull/44) addressed the configuration edge case with regression coverage. |
| [Perch](https://github.com/lakeday-org/perch) | JavaScript | [#82](https://github.com/lakeday-org/perch/pull/82) delivered a focused upstream fix in a compact contributor community. |

### Key contributor · broader communities

For projects with larger contributor bases, I use **key contributor** to make the scope of my role explicit.

| Project | Stack | Selected upstream work |
| --- | --- | --- |
| [node-csv](https://github.com/adaltas/node-csv) | JavaScript / TypeScript | **Merged** [#510](https://github.com/adaltas/node-csv/pull/510): corrected formula escaping without corrupting negative values. |
| [yarr](https://github.com/nkanaev/yarr) | Go | **Merged** [#337](https://github.com/nkanaev/yarr/pull/337): restored the `.exe` suffix in Windows CLI release artifacts. |
| [connect-py](https://github.com/connectrpc/connect-py) | Python | **Merged** [#339](https://github.com/connectrpc/connect-py/pull/339): synchronized package-version checks with the project’s release metadata. |
| [floci-gcp](https://github.com/floci-io/floci-gcp) | Java | **Merged** [#235](https://github.com/floci-io/floci-gcp/pull/235), with maintainer-requested rebasing and conflict resolution. |
| [spicelib](https://github.com/nunobrum/spicelib) | Python | [#326](https://github.com/nunobrum/spicelib/pull/326): reworked the test contribution around maintainer feedback. |
| [Tele](https://github.com/sorokin-vladimir/tele) | Go | [#280](https://github.com/sorokin-vladimir/tele/pull/280): improved account-state isolation and startup cleanup, with follow-up review changes. |
| [Jackson Java 8](https://github.com/FasterXML/jackson-modules-java8) | Java | [#391](https://github.com/FasterXML/jackson-modules-java8/pull/391): added a focused CBOR type-validation fix and regression coverage. |
| [PyPCAPKit](https://github.com/JarryShaw/PyPCAPKit) | Python | [#571](https://github.com/JarryShaw/PyPCAPKit/pull/571): investigated parser-length edge cases and documented the safer bounded follow-up. |

## Research

- **[SWE-Explore](https://github.com/Ayanami1314/swe-explore)** — **First author.** A trajectory-based benchmark for evaluating how coding agents explore and localize relevant code in large repositories.
- **[SWE-Pruner Pro](https://github.com/Ayanami1314/swe-pruner-pro)** — **Key contributor.** An in-agent context pruner that uses the coding model’s own hidden states to keep useful tool-response structure while reducing context load. See [arXiv:2607.18213](https://arxiv.org/abs/2607.18213).

## How I like to collaborate

```text
reproduce → minimize → add a regression test → discuss the trade-off → ship upstream
```

I value small diffs, honest attribution, and fixes that remain understandable six months later.

<div align="center">

### Thanks for stopping by — feel free to explore the repositories and PRs above.

</div>
