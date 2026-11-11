# Launch a Qattice devnet from Chain Forge

Build the Qattice devnet binary from the tested Qattice revision. These commands assume the Qattice checkout is a sibling of the Chain Forge frontend checkout.

```bash
git clone https://github.com/cluna80/Qattice.git ../Qattice
git -C ../Qattice checkout --detach 5b6d39161c6bfbf22feabba35ed2f499cad80058
cargo build --manifest-path ../Qattice/Cargo.toml --release --locked -p chain-forge-node --bin pq-devnet-node --features pq-anchored-evidence
```

Start the local service from the Chain Forge frontend checkout. On Windows, append `.exe` to the binary path.

```bash
cargo run --manifest-path engine/Cargo.toml -p chain-forge-service -- --pq-devnet-bin ../Qattice/target/release/pq-devnet-node
```

In a second terminal in the same checkout, start the frontend.

```bash
npm ci
npm run dev -- --host localhost --port 5173 --strictPort
```

Open http://localhost:5173, open the chain creation wizard, and select **Create Qattice Devnet**. Choose a fresh chain ID and click **Launch four validators**. The service generates four ML-DSA-65 keypairs and a fresh genesis, starts four loopback-only PQ-HotStuff-2 validators, and reports execution heights and pruning watermarks. Click **Stop chain** when finished. The data directory shown in the app retains genesis, logs, private validator keys, and node state. Choose a new chain ID for another launch.

This preset uses the interim devnet executor. It demonstrates consensus and payload pruning on a private local network. Qattice account execution, DIS admission, and public-network deployment require separate integration.
