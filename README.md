# @kriper0nind/wg-utils

A type-safe TypeScript library for managing WireGuard configuration files, peers, keys, client profiles, QR codes, and interfaces.

## Quick Start

```bash
npm install @kriper0nind/wg-utils
```

```ts
import { addPeer, generateClientConfig, generateKeys, initConf, up } from "@kriper0nind/wg-utils"

const serverKeys = await generateKeys()
const clientKeys = await generateKeys()

await initConf("/etc/wireguard/wg0.conf", {
  privateKey: serverKeys.privateKey,
  ip: "10.0.0.1",
  dns: "1.1.1.1",
})

const peer = await addPeer("/etc/wireguard/wg0.conf", {
  publicKey: clientKeys.publicKey,
  persistentKeepalive: 25,
})

const clientConfig = generateClientConfig({
  privateKey: clientKeys.privateKey,
  clientAddress: peer.address,
  serverPublicKey: serverKeys.publicKey,
  serverEndpoint: "vpn.example.com:51820",
  dns: "1.1.1.1",
  persistentKeepalive: 25,
})

await up("wg0")
console.log(clientConfig)
```

Keys are kept in memory by default. Pass `privateKeyPath`/`publicKeyPath` or `keyPath` only when you want the library to write files, which are created with mode `0600`.

## Features

- Typed parsing and serialization with undefined/empty field omission
- Atomic config writes, optional backups, and `0600` permissions
- Subnet-aware IPv4 and IPv6 peer allocation
- Peer CRUD, enable/disable, and comment-preserving edits
- Safe command execution without shell interpolation
- Client config and QR code generation
- Interface status, save, restart, and sync helpers
- Linux, macOS, and Windows command paths
- ESM and CommonJS builds with TypeScript declarations

## Configuration API

```ts
import {
  getPeer,
  listPeers,
  readConfig,
  setPeerEnabled,
  updatePeer,
  writeConfig,
} from "@kriper0nind/wg-utils"

const config = await readConfig("/etc/wireguard/wg0.conf")
config.Interface!.ListenPort = 51821
await writeConfig("/etc/wireguard/wg0.conf", config, { backup: true })

await updatePeer("/etc/wireguard/wg0.conf", "peer-public-key", {
  PersistentKeepalive: 25,
})

await setPeerEnabled("/etc/wireguard/wg0.conf", "peer-public-key", false)
await setPeerEnabled("/etc/wireguard/wg0.conf", "peer-public-key", true)

console.log(await listPeers("/etc/wireguard/wg0.conf"))
console.log(await getPeer("/etc/wireguard/wg0.conf", "peer-public-key"))
```

`parse`, `stringify`, `readConfig`, and `writeConfig` use exported `WireGuardConfig`, `WireGuardInterface`, and `WireGuardPeer` types. Repeated keys such as multiple `Address` lines are merged as comma-separated values.

## Peer Management

```ts
import { addPeer, deletePeer, getNextPeerAddress } from "@kriper0nind/wg-utils"

const result = await addPeer("/etc/wireguard/wg0.conf", {
  publicKey: "peer-public-key",
  presharedKey: "preshared-key",
  persistentKeepalive: 25,
  sync: "auto",
})

console.log(result.address) // 10.0.0.2/32
console.log(result.ip) // 10.0.0.2

const ipv6 = getNextPeerAddress(
  {
    Interface: { Address: ["10.0.0.1/24", "fd00::1/64"] },
  },
  { family: "ipv6" },
)

await deletePeer("/etc/wireguard/wg0.conf", { publicKey: "peer-public-key" })
```

Address allocation derives the pool from `Interface.Address`, skips used addresses, supports `/32` IPv4 and `/128` IPv6 peers, and throws `AddressPoolExhaustedError` when no address remains.

## Interface API

```ts
import {
  down,
  getInterfaceStatus,
  getLatestHandshake,
  isWgUp,
  restart,
  saveConfig,
  syncConf,
  up,
} from "@kriper0nind/wg-utils"

await up("wg0")
console.log(await isWgUp("wg0"))
console.log(await getInterfaceStatus("wg0"))
console.log(await getLatestHandshake("wg0"))
await syncConf("wg0")
await saveConfig("wg0")
await restart("wg0")
await down("wg0")
```

On Windows, `up`/`down` use the WireGuard tunnel service through `wireguard.exe`. You can override executable paths with:

- `WG_UTILS_WG_PATH`
- `WG_UTILS_WG_QUICK_PATH`
- `WG_UTILS_WIREGUARD_PATH`

## Client Configs and QR Codes

```ts
import { generateClientConfig, generateClientQRCode } from "@kriper0nind/wg-utils"

const configText = generateClientConfig({
  privateKey: "client-private-key",
  clientAddress: "10.0.0.2/32",
  serverPublicKey: "server-public-key",
  serverEndpoint: "vpn.example.com:51820",
  allowedIPs: ["0.0.0.0/0", "::/0"],
  dns: "1.1.1.1",
  persistentKeepalive: 25,
})

const dataUrl = await generateClientQRCode(configText)
const filepath = await generateClientQRCode(configText, {
  outputPath: "/tmp/client.png",
})
```

## Error Handling

All library errors extend `WireGuardError`:

- `ConfigParseError`
- `ConfigValidationError`
- `WgNotFoundError`
- `CommandError`
- `PeerNotFoundError`
- `PeerAlreadyExistsError`
- `AddressPoolExhaustedError`
- `UnsupportedPlatformError`

```ts
import { ConfigValidationError, WgNotFoundError } from "@kriper0nind/wg-utils"

try {
  await up("wg0")
} catch (error) {
  if (error instanceof WgNotFoundError) {
    console.error("Install WireGuard first")
  } else if (error instanceof ConfigValidationError) {
    console.error(error.message)
  }
}
```

## Requirements

- Node.js 20 or newer
- WireGuard tools for key and interface operations
- Root/sudo privileges for system interface management
- `iptables` for the default NAT hooks generated by `initConf`

## Development

```bash
npm ci
npm run check
```

`npm run check` runs linting, formatting verification, type checking, tests, and the dual ESM/CJS build.

## License

MIT © [dsavelyev-man](https://github.com/dsavelyev-man)
