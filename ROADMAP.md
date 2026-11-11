# Chain Forge Product Roadmap

Chain Forge is a blockchain creation tool. Qattice is its first reference chain. The frontend owns the setup wizard and operator experience. The [engine roadmap](https://github.com/cluna80/chain-forge-engine/blob/main/ROADMAP.md) tracks Qattice protocol acceptance and release gates.

## Product milestones

| Milestone | Status | Acceptance criteria | Qattice dependency |
| --- | --- | --- | --- |
| Local chain setup and status | In review ([#5](https://github.com/cluna80/chain-forge-frontend/pull/5)) | The wizard builds and typechecks. Selecting a chain shows that chain's node status, and a failed stop request displays an error. | None. |
| Create Qattice Devnet | In review ([#6](https://github.com/cluna80/chain-forge-frontend/pull/6)), stacked on #5 | From a clean local setup, launch four loopback validators with fresh ML-DSA-65 keys and genesis. Confirm agreement at a shared height, display pruning watermarks, and stop the processes from the UI. | Uses a pinned standalone Qattice devnet binary and interim execution. See the [PQ-HotStuff-2 implementation record](https://github.com/cluna80/chain-forge-engine/blob/main/ROADMAP.md#pq-hotstuff-2-implementation-status--2026-11-09-newest-status-documentation-only-append-only) and [defensive pruning requirements](https://github.com/cluna80/chain-forge-engine/blob/main/ROADMAP.md#owner-architecture-decision--2026-11-08-defensive-pruning-and-recoverable-pq-ledger-locked-requirements-implementation-open). The launcher has a separate review from formal QAT-08 acceptance. |
| Native PQ-HotStuff-2 engine (CF-C1) | Planned | Register PQ-HotStuff-2 as a distinct engine. Validate and load its genesis through the native node startup path. Reject incompatible profiles and keys at startup. | [QAT-06 through QAT-08](https://github.com/cluna80/chain-forge-engine/blob/main/ROADMAP.md#dependency-ordered-public-testnet-release-gates) cover consensus safety, durable signing and membership policy, and the private four-node acceptance suite. QAT-07 and QAT-08 gate Qattice acceptance. |
| PQ-HotStuff-2 wizard configuration (CF-W1) | Planned, depends on CF-C1 | Select PQ-HotStuff-2 in the general wizard, validate required settings, export a genesis the native node accepts, and surface validation errors before launch. | [Qattice consensus direction](https://github.com/cluna80/chain-forge-engine/blob/main/ROADMAP.md#consensus-separation--qattice-versus-chain-forge) specifies a fresh PQ-HotStuff-2 genesis. The builder continues to offer Tendermint to other chain projects. |
| Build Qattice from scratch | Planned | Start with an empty workspace. Generate a fresh Qattice genesis in the Chain Forge wizard. The native node must launch from that wizard-generated file without manual edits. Start four validators and show a common finalized block and application state root after a real ML-DSA-65 transaction. Record reproducible Linux and Windows results. | [QAT-02 through QAT-04 and QAT-08](https://github.com/cluna80/chain-forge-engine/blob/main/ROADMAP.md#dependency-ordered-public-testnet-release-gates) cover signing, genesis, authoritative application state, and private network acceptance. For a pruning-enabled run, demonstrate recovery from pruned storage under the [defensive pruning requirements](https://github.com/cluna80/chain-forge-engine/blob/main/ROADMAP.md#owner-architecture-decision--2026-11-08-defensive-pruning-and-recoverable-pq-ledger-locked-requirements-implementation-open). |

## Related work

| Item | Status | Qattice dependency |
| --- | --- | --- |
| Retired QRC controls (CF-Q1) | Removal in review ([#7](https://github.com/cluna80/chain-forge-frontend/pull/7)). | None. |
| ML-DSA-65 transaction enforcement (CF-S1) | Existing execution checks passed A-01 through A-09 on Windows on 2026-11-11 from the `main` checkout in `qattice-main-wt`. [#8](https://github.com/cluna80/chain-forge-frontend/pull/8) updates the frontend status text. | [QAT-02 and QAT-03](https://github.com/cluna80/chain-forge-engine/blob/main/ROADMAP.md#dependency-ordered-public-testnet-release-gates) track signing and genesis policy. The native Qattice build still needs its own end-to-end execution evidence. |
| Committed slashing (CF-N1) | Scoped for QAT-08. | [QAT-05 and QAT-08](https://github.com/cluna80/chain-forge-engine/blob/main/ROADMAP.md#dependency-ordered-public-testnet-release-gates) cover committed evidence, deterministic penalties, and cross-node agreement. |

## Review order

Review #5, then retarget #6 to `main` after #5 lands and verify the combined launcher workflow. Land #7 and #8 before starting CF-C1 implementation so the retired QRC controls are removed and the ML-DSA-65 status text is current. Track implementation, test evidence, merge, and release approval individually. Public deployment is governed by the [Qattice release gates](https://github.com/cluna80/chain-forge-engine/blob/main/ROADMAP.md#dependency-ordered-public-testnet-release-gates).
