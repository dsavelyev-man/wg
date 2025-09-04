# @kriper0nind/wg-utils

A powerful TypeScript library for programmatically managing WireGuard VPN configurations.

## Quick Start

```bash
npm install @kriper0nind/wg-utils
```

```ts
import { generateKeys, initConf, addPeer, up } from "@kriper0nind/wg-utils"

// 1. Generate server keys
const serverKeys = await generateKeys()

// 2. Create server configuration
await initConf("/etc/wireguard/wg0.conf", {
  privateKey: serverKeys.privateKey,
  port: 51820,
  ip: "10.0.0.1"
})

// 3. Add a client
const clientKeys = await generateKeys()
const result = await addPeer("/etc/wireguard/wg0.conf", {
  publicKey: clientKeys.publicKey
})

// 4. Start the VPN
await up("wg0")

console.log(`Client IP: ${result.ip}`) // "10.0.0.2"
```

## Features

- 🔑 **Key Management** - Generate WireGuard key pairs securely
- ⚙️ **Configuration Management** - Parse, modify, and stringify configs
- 👥 **Peer Management** - Add/remove peers with automatic IP assignment
- 🔌 **Interface Control** - Start/stop WireGuard interfaces programmatically
- 🛡️ **Type Safety** - Full TypeScript support
- ⚡ **Easy to Use** - Simple, intuitive APIs

## Core Functions

### Configuration Management
- `parse(configText)` - Parse WireGuard configs into JavaScript objects
- `stringify(config)` - Convert config objects back to WireGuard format

### Key Operations
- `generateKeys()` - Generate new key pairs
- `getPubKey(filepath)` - Extract public key from private key

### Server Management
- `initConf(filepath, options)` - Create initial server configuration
- `up(iface)` / `down(iface)` - Control WireGuard interfaces

### Peer Management
- `addPeer(filepath, { publicKey })` - Add peer with auto IP assignment
- `deletePeer(filepath, { publicKey })` - Remove peer by public key

## Examples

### Basic Server Setup
```ts
import { generateKeys, initConf, up } from "@kriper0nind/wg-utils"

const keys = await generateKeys()
await initConf("/etc/wireguard/wg0.conf", {
  privateKey: keys.privateKey,
  port: 51820,
  ip: "10.0.0.1"
})
await up("wg0")
```

### Add Multiple Clients
```ts
import { generateKeys, addPeer } from "@kriper0nind/wg-utils"

const clients = []
for (let i = 0; i < 5; i++) {
  const keys = await generateKeys()
  const result = await addPeer("/etc/wireguard/wg0.conf", {
    publicKey: keys.publicKey
  })
  clients.push({ ...keys, ip: result.ip })
}
```

### Configuration Manipulation
```ts
import { parse, stringify } from "@kriper0nind/wg-utils"
import { readFile, writeFile } from "fs/promises"

// Read and modify configuration
const configContent = await readFile("/etc/wireguard/wg0.conf", "utf-8")
const config = parse(configContent)

config.Interface.ListenPort = 51821
config.Peers.push({
  PublicKey: "new-client-key",
  AllowedIPs: "10.0.0.10/32"
})

// Save changes
const newConfig = stringify(config)
await writeFile("/etc/wireguard/wg0.conf", newConfig)
```

## Requirements

- Node.js 16+
- WireGuard installed
- Root/sudo privileges for interface management
- iptables for NAT functionality

## Documentation

📖 **[Full Documentation](https://dsavelyev-man.github.io/wg)** - Complete API reference and guides

## License

MIT © [dsavelyev-man](https://github.com/dsavelyev-man)
