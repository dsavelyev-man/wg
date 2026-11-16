import { ConfigValidationError } from "../errors"
import { IpAddressFamily, PeerAddressAllocation, SyncOptions, WireGuardPeer } from "../types"
import { addPeerToConfig, appendPeer, readConfig } from "./config"
import { formatAddress, getNextPeerAddress, parseCidr } from "./ip"
import { syncAfterConfigChange } from "./syncAfterConfigChange"

export interface AddPeerOptions extends SyncOptions {
  publicKey: string
  persistentKeepalive?: number
  presharedKey?: string
  allowedIPs?: string | string[]
  endpoint?: string
  allowedApps?: string
  family?: IpAddressFamily
  /** Override the interface subnet used for automatic allocation. */
  addressPool?: string
}

export interface AddPeerResult {
  ip: string
  address: string
  family: IpAddressFamily
  peer: WireGuardPeer
}

const allocationFromAllowedIPs = (allowedIPs: string | string[]): PeerAddressAllocation => {
  const first = Array.isArray(allowedIPs) ? allowedIPs[0] : allowedIPs.split(",")[0]
  const parsed = parseCidr(first.trim())
  return {
    address: `${formatAddress(parsed.family, parsed.address)}/${parsed.prefix}`,
    ip: formatAddress(parsed.family, parsed.address),
    cidr: String(parsed.prefix),
    family: parsed.family,
  }
}

/**
 * Add a peer and allocate an address from the interface subnet when a custom
 * AllowedIPs value is not supplied. The update is written atomically and is
 * synchronized only when `sync` is `true` or the interface is already running.
 */
export const addPeer = async (
  filepath: string,
  options: AddPeerOptions,
): Promise<AddPeerResult> => {
  const publicKey = options.publicKey?.trim()
  if (!publicKey) throw new ConfigValidationError("publicKey is required.")

  const config = await readConfig(filepath)
  const allocation = options.allowedIPs
    ? allocationFromAllowedIPs(options.allowedIPs)
    : getNextPeerAddress(config, {
        family: options.family,
        addressPool: options.addressPool,
      })

  const peer: WireGuardPeer = {
    PublicKey: publicKey,
    AllowedIPs: options.allowedIPs ?? allocation.address,
  }
  if (options.presharedKey !== undefined) peer.PresharedKey = options.presharedKey
  if (options.persistentKeepalive !== undefined) {
    peer.PersistentKeepalive = options.persistentKeepalive
  }
  if (options.endpoint !== undefined) peer.Endpoint = options.endpoint
  if (options.allowedApps !== undefined) peer.AllowedApps = options.allowedApps

  addPeerToConfig(config, peer)
  await appendPeer(filepath, peer)
  await syncAfterConfigChange(filepath, options)

  return {
    ip: allocation.ip,
    address: allocation.address,
    family: allocation.family,
    peer,
  }
}
