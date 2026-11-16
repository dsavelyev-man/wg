import { getInterfaceStatus } from "./interfaceStatus"

export interface HandshakeInfo {
  publicKey: string
  handshake?: string
  endpoint?: string
  allowedIps?: string
  latestHandshake?: string
  transfer?: string
  latestHandshakeSeconds: number
  transferRx: number
  transferTx: number
  persistentKeepalive: number
}

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KiB", "MiB", "GiB", "TiB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[index]}`
}

/**
 * Retrieve peer handshake and transfer statistics using the stable
 * `wg show <iface> dump` output format.
 */
export const getLatestHandshake = async (iface: string): Promise<HandshakeInfo[]> => {
  const status = await getInterfaceStatus(iface)
  return status.peers.map((peer) => ({
    publicKey: peer.publicKey,
    handshake: peer.latestHandshakeAt,
    endpoint: peer.endpoint,
    allowedIps: peer.allowedIps.join(", ") || undefined,
    latestHandshake: peer.latestHandshakeAt,
    transfer: `${formatBytes(peer.transferRx)} received, ${formatBytes(peer.transferTx)} sent`,
    latestHandshakeSeconds: peer.latestHandshake,
    transferRx: peer.transferRx,
    transferTx: peer.transferTx,
    persistentKeepalive: peer.persistentKeepalive,
  }))
}
