import { ConfigValidationError } from "../errors"
import { WireGuardConfig, WireGuardInterface, WireGuardPeer } from "../types"
import { writeConfig } from "./config"

export interface InitConfOptions {
  port?: number
  /** Interface address, with or without CIDR. Defaults to 10.0.0.1/24. */
  ip?: string | string[]
  address?: string | string[]
  privateKey: string
  /** Outbound interface used by the default iptables NAT rules. */
  interface?: string
  dns?: string | string[]
  postUp?: string[]
  postDown?: string[]
  mtu?: string | number
  table?: string
  peers?: WireGuardPeer[]
}

const withDefaultPrefix = (address: string): string => {
  const value = address.trim()
  return value.includes("/") ? value : `${value}/24`
}

/**
 * Create an initial WireGuard server configuration file.
 *
 * Undefined optional keys are omitted from the output. The file is written
 * atomically with mode 0600.
 */
export const initConf = async (filepath: string, options: InitConfOptions): Promise<void> => {
  if (!options.privateKey?.trim()) {
    throw new ConfigValidationError("A server privateKey is required.")
  }

  const rawAddress = options.address ?? options.ip ?? "10.0.0.1/24"
  const addresses = (Array.isArray(rawAddress) ? rawAddress : [rawAddress]).map(withDefaultPrefix)
  const outboundInterface = options.interface ?? "eth0"

  const iface: WireGuardInterface = {
    Address: addresses.length === 1 ? addresses[0] : addresses,
    ListenPort: options.port ?? 51820,
    PrivateKey: options.privateKey.trim(),
  }
  if (options.dns !== undefined) iface.DNS = options.dns
  if (options.mtu !== undefined) iface.MTU = options.mtu
  if (options.table !== undefined) iface.Table = options.table
  if (options.postUp !== undefined) {
    if (options.postUp.length > 0) iface.PostUp = options.postUp.join("; ")
  } else {
    iface.PostUp =
      `iptables -A FORWARD -i %i -j ACCEPT; ` +
      `iptables -t nat -A POSTROUTING -o ${outboundInterface} -j MASQUERADE`
  }
  if (options.postDown !== undefined) {
    if (options.postDown.length > 0) iface.PostDown = options.postDown.join("; ")
  } else {
    iface.PostDown =
      `iptables -D FORWARD -i %i -j ACCEPT; ` +
      `iptables -t nat -D POSTROUTING -o ${outboundInterface} -j MASQUERADE`
  }

  const config: WireGuardConfig = { Interface: iface }
  if (options.peers?.length) config.Peers = options.peers
  await writeConfig(filepath, config, { createDirectory: true, mode: 0o600 })
}
