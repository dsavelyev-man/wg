export type WireGuardScalar = string | number | boolean
export type WireGuardValue = WireGuardScalar | string[] | null | undefined

export interface WireGuardSection {
  [key: string]: WireGuardValue
}

export interface WireGuardInterface extends WireGuardSection {
  Address?: string | string[]
  ListenPort?: string | number
  PrivateKey?: string
  DNS?: string | string[]
  MTU?: string | number
  Table?: string
  PostUp?: string
  PostDown?: string
}

export interface WireGuardPeer extends WireGuardSection {
  PublicKey?: string
  PresharedKey?: string
  AllowedIPs?: string | string[]
  Endpoint?: string
  PersistentKeepalive?: string | number
  AllowedApps?: string
}

export interface WireGuardConfig {
  Interface?: WireGuardInterface
  Peers?: WireGuardPeer[]
  [section: string]: WireGuardSection | WireGuardPeer[] | undefined
}

export type IpAddressFamily = "ipv4" | "ipv6"

export interface PeerAddressAllocation {
  address: string
  ip: string
  cidr: string
  family: IpAddressFamily
}

export interface ConfigWriteOptions {
  /** Create the parent directory when it does not exist. Defaults to true. */
  createDirectory?: boolean
  /** Copy the previous file to `<filepath>.bak-<timestamp>` before replacing it. */
  backup?: boolean
  /** File mode used for the atomic temporary file and the final config. Defaults to 0o600. */
  mode?: number
}

export interface SyncOptions {
  /**
   * Interface name. When omitted, it is derived from the config filename.
   * For `/etc/wireguard/wg0.conf`, the interface is `wg0`.
   */
  iface?: string
  /**
   * Apply the updated file to a running interface.
   * `"auto"` skips synchronization when the interface is not running.
   */
  sync?: boolean | "auto"
}
