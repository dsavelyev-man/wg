import { runWg } from "../commands"
import { ConfigValidationError } from "../errors"

export const validateInterfaceName = (iface: string): string => {
  const normalized = iface.trim()
  if (!/^[a-zA-Z0-9_=+.-]{1,32}$/.test(normalized)) {
    throw new ConfigValidationError(`Invalid WireGuard interface name: ${iface}`)
  }
  return normalized
}

export interface PeerStatus {
  publicKey: string
  presharedKey?: string
  endpoint?: string
  allowedIps: string[]
  latestHandshake: number
  latestHandshakeAt?: string
  transferRx: number
  transferTx: number
  persistentKeepalive: number
}

export interface InterfaceStatus {
  name: string
  publicKey?: string
  listenPort: number
  fwmark?: string
  peers: PeerStatus[]
}

const optionalValue = (value: string): string | undefined =>
  value && value !== "(none)" ? value : undefined

/**
 * Parse the stable machine-readable output of `wg show <iface> dump`.
 */
export const parseWgDump = (iface: string, output: string): InterfaceStatus => {
  const lines = output.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) {
    throw new ConfigValidationError(`Empty wg dump output for ${iface}.`)
  }

  const interfaceFields = lines[0].split("\t")
  if (interfaceFields.length < 4) {
    throw new ConfigValidationError(`Invalid wg dump interface line for ${iface}.`)
  }

  const status: InterfaceStatus = {
    name: iface,
    publicKey: optionalValue(interfaceFields[1]),
    listenPort: Number(interfaceFields[2]) || 0,
    fwmark: optionalValue(interfaceFields[3]),
    peers: [],
  }

  for (const line of lines.slice(1)) {
    const fields = line.split("\t")
    if (fields.length < 8) continue
    const latestHandshake = Number(fields[4]) || 0
    status.peers.push({
      publicKey: fields[0],
      presharedKey: optionalValue(fields[1]),
      endpoint: optionalValue(fields[2]),
      allowedIps: fields[3]
        ? fields[3]
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      latestHandshake,
      latestHandshakeAt:
        latestHandshake > 0 ? new Date(latestHandshake * 1000).toISOString() : undefined,
      transferRx: Number(fields[5]) || 0,
      transferTx: Number(fields[6]) || 0,
      persistentKeepalive: Number(fields[7]) || 0,
    })
  }

  return status
}

export const getInterfaceStatus = async (iface: string): Promise<InterfaceStatus> => {
  const name = validateInterfaceName(iface)
  const { stdout } = await runWg(["show", name, "dump"])
  return parseWgDump(name, stdout)
}

export const isWgUp = async (iface: string): Promise<boolean> => {
  try {
    const name = validateInterfaceName(iface)
    await runWg(["show", name])
    return true
  } catch {
    return false
  }
}
