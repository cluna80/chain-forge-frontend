# Engine source record

Copied from https://github.com/cluna80/chain-forge-engine at commit
`61e02c60a7d894f9914daadda1513f9c2940d057` (main, 2026-11-04). The source repository
remains authoritative until the cutover; this directory is re-synced from it, and no
feature work lands only here.

Batch 1 (copied unchanged, no code edits): chain-forge-core, chain-forge-crypto,
chain-forge-p2p, chain-forge-service, chain-forge-keygen.

Only the workspace manifest (`engine/Cargo.toml`) and `engine/Cargo.lock` (copied from the
source, pruned by cargo to this workspace) are new. The legacy root `Cargo.toml` and
`chain-forge-consensus/` of this repository are untouched.

Verify a crate is unchanged: `diff -r engine/chain-forge-core <source>/chain-forge-core`.
tokio must stay >= 1.54.1 (1.54.0 has a timer use-after-free; see the source repo's
NODE-TOKIO-1).

## Deliberate deviations from an unchanged copy (Batch 1)
- `chain-forge-core/src/lib.rs` (one test, line ~1565): `pilot_devnet_genesis_is_authorized_only_on_feature_builds`
  read Qattice's `genesis-4node.json` from the source repository root. Qattice's genesis stays with Qattice
  (owner decision 2026-11-04) and is NOT part of this repository. The test now reads a generic fixture,
  `chain-forge-core/tests/fixtures/generic-devnet-genesis.json` (example chain id, prefix `ex`, denom `uexm`; no PoCD
  and no Qattice settlement data), with the same dev-identity settings the test checks. No other source line changed.

## Known Qattice coupling left in Batch 1
- `chain-forge-crypto/src/bin/gen_devnet_keys.rs` writes devnet keys relative to the repository root (Qattice devnet
  tooling). Candidate to stay in Qattice; kept for now so the rest of the crate is an unchanged copy.
