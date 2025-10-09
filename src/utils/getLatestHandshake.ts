import { exec } from "./helpers"

export interface HandshakeInfo {
  publicKey: string
  handshake?: string
  endpoint?: string
  allowedIps?: string
  latestHandshake?: string
  transfer?: string
}

/**
 * Retrieves the latest handshake information for all peers on a WireGuard interface.
 *
 * This function uses the `wg show` command to get detailed information about all peers
 * connected to the specified WireGuard interface, including their latest handshake timestamps,
 * transfer statistics, and connection endpoints.
 *
 * @param iface The name of the WireGuard interface (e.g., "wg0")
 * @returns Promise that resolves with an array of handshake information for each peer
 * @throws If the interface doesn't exist or WireGuard tools are not available
 *
 * @example
 * ```ts
 * import { getLatestHandshake } from "@kriper0nind/wg-utils"
 *
 * const handshakes = await getLatestHandshake("wg0")
 * console.log("Peer handshakes:", handshakes)
 * // Output: [
 * //   {
 * //     publicKey: "abc123...",
 * //     handshake: "2024-01-15 10:30:45",
 * //     endpoint: "192.168.1.100:51820",
 * //     allowedIps: "10.0.0.2/32",
 * //     latestHandshake: "2024-01-15 10:30:45",
 * //     transfer: "1.2 KiB received, 856 B sent"
 * //   }
 * // ]
 * ```
 */
export const getLatestHandshake = async (iface: string): Promise<HandshakeInfo[]> => {
  try {
    const { stdout } = await exec(`wg show ${iface}`)
    return parseWgShowOutput(stdout)
  } catch (error) {
    throw new Error(`Failed to get handshake information for interface ${iface}: ${error.message}`)
  }
}

/**
 * Parses the output from `wg show` command into structured handshake information.
 *
 * @param output Raw output from `wg show` command
 * @returns Array of parsed handshake information
 */
function parseWgShowOutput(output: string): HandshakeInfo[] {
  const lines = output.split('\n')
  const peers: HandshakeInfo[] = []
  let currentPeer: HandshakeInfo | null = null

  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) {
      if (currentPeer) {
        peers.push(currentPeer)
        currentPeer = null
      }
      continue
    }

    // Check if this is a peer line (starts with "peer:")
    if (trimmedLine.startsWith('peer:')) {
      if (currentPeer) {
        peers.push(currentPeer)
      }
      currentPeer = {
        publicKey: trimmedLine.replace('peer:', '').trim()
      }
      continue
    }

    // Parse peer properties
    if (currentPeer && trimmedLine.includes(':')) {
      const [key, ...valueParts] = trimmedLine.split(':')
      const value = valueParts.join(':').trim()
      
      switch (key.trim()) {
        case 'handshake':
          currentPeer.handshake = value
          break
        case 'endpoint':
          currentPeer.endpoint = value
          break
        case 'allowed ips':
          currentPeer.allowedIps = value
          break
        case 'latest handshake':
          currentPeer.latestHandshake = value
          break
        case 'transfer':
          currentPeer.transfer = value
          break
      }
    }
  }

  // Don't forget the last peer
  if (currentPeer) {
    peers.push(currentPeer)
  }

  return peers
}
