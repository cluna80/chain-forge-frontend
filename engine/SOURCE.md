# Engine source record

Copied from https://github.com/cluna80/chain-forge-engine at commit
`61e02c60a7d894f9914daadda1513f9c2940d057` (main, 2026-11-04). The source repository
remains authoritative until the cutover; this directory is re-synced from it, and no
feature work lands only here.

Batch 1 (copied unchanged except one test, see below): chain-forge-core, chain-forge-crypto,
chain-forge-p2p, chain-forge-service, chain-forge-keygen.

Batch 2 (copied unchanged, no code edits; same source commit): chain-forge-vca-pq,
chain-forge-consensus. `state` and `identity` are deliberately NOT included yet: the
account record in `state` carries DIS fields (key version, recovery policy, pending
recovery), which stay in Qattice; they move later with an account-extension design that
keeps Qattice's state roots byte-identical.

Only the workspace manifest (`engine/Cargo.toml`) and `engine/Cargo.lock` (copied from the
source, pruned by cargo to this workspace) are new. The legacy root `Cargo.toml` and
`chain-forge-consensus/` of this repository are untouched.

Verify a crate is unchanged: `diff -r engine/chain-forge-core <source>/chain-forge-core`.
tokio must stay >= 1.54.1 (1.54.0 has a timer use-after-free; see the source repo's
NODE-TOKIO-1).

Batch 3 (copied from the same source commit): chain-forge-identity, chain-forge-validators, chain-forge-slashing,
chain-forge-governance, chain-forge-personhood. Deviation: `chain-forge-validators/Cargo.toml` no longer lists
`chain-forge-tokenomics` (declared in the source but never imported by its code; only two comments mention it), so
the validators/slashing/governance group does not pull in the QRC-shaped tokenomics crate. No Rust source line changed.
`state`, `execution`, `node`, `tokenomics` and `agents` are not included yet.

QRC (retired by owner decision 2026-11-04) is STRIPPED from this batch's copy (owner decision: Chain Forge carries no retired
code; the original repo keeps its version until the planned QRC cleanup). Edits, all outside any signed/persisted Chain Forge
data: `chain-forge-governance`: the `ProposalKind::QrcParameter` variant and its display name removed, the doc header and
`Cargo.toml` comment reworded, the test helper `qrc_proposal` renamed `parameter_proposal` and now builds a `ChainParameter`
proposal (same ordinary-governance semantics); `chain-forge-identity`: five comments / log strings reworded (no "QRC");
`chain-forge-personhood`: one comment reworded. No other source line changed. Note: a serialized `QrcParameter` proposal from
Qattice would not deserialize in this copy; Chain Forge has no such data.

## Deliberate deviations from an unchanged copy (Batch 1)
- `chain-forge-core/src/lib.rs` (one test, line ~1565): `pilot_devnet_genesis_is_authorized_only_on_feature_builds`
  read Qattice's `genesis-4node.json` from the source repository root. Qattice's genesis stays with Qattice
  (owner decision 2026-11-04) and is NOT part of this repository. The test now reads a generic fixture,
  `chain-forge-core/tests/fixtures/generic-devnet-genesis.json` (example chain id, prefix `ex`, denom `uexm`; no PoCD
  and no Qattice settlement data), with the same dev-identity settings the test checks. No other source line changed.

## Known Qattice coupling left in Batch 1
- `chain-forge-crypto/src/bin/gen_devnet_keys.rs` writes devnet keys relative to the repository root (Qattice devnet
  tooling). Candidate to stay in Qattice; kept for now so the rest of the crate is an unchanged copy.
