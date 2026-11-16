import { mkdir, writeFile } from "fs/promises"
import { dirname } from "path"
import * as QRCode from "qrcode"
import { ConfigValidationError } from "../errors"
import { stringify } from "../parser/stringify"
import { WireGuardConfig, WireGuardInterface, WireGuardPeer, WireGuardValue } from "../types"
import { assertWireGuardKey } from "./keys"

export interface GenerateClientConfigOptions {
  privateKey: string
  clientAddress: string | string[]
  serverPublicKey: string
  serverEndpoint: string
  allowedIPs?: string | string[]
  dns?: string | string[]
  persistentKeepalive?: number
  presharedKey?: string
  mtu?: string | number
  extraInterface?: Record<string, WireGuardValue>
  extraPeer?: Record<string, WireGuardValue>
}

export interface ClientQRCodeOptions {
  outputPath?: string
  type?: "data-url" | "terminal"
  width?: number
}

/** Build a standalone client configuration as text. */
export const generateClientConfig = (options: GenerateClientConfigOptions): string => {
  const privateKey = assertWireGuardKey(options.privateKey, "client private key")
  const serverPublicKey = assertWireGuardKey(options.serverPublicKey, "server public key")
  if (!options.serverEndpoint?.trim()) {
    throw new ConfigValidationError("serverEndpoint is required.")
  }

  const iface: WireGuardInterface = {
    PrivateKey: privateKey,
    Address: options.clientAddress,
  }
  if (options.dns !== undefined) iface.DNS = options.dns
  if (options.mtu !== undefined) iface.MTU = options.mtu
  Object.assign(iface, options.extraInterface)

  const peer: WireGuardPeer = {
    PublicKey: serverPublicKey,
    AllowedIPs: options.allowedIPs ?? ["0.0.0.0/0", "::/0"],
    Endpoint: options.serverEndpoint.trim(),
  }
  if (options.presharedKey !== undefined) {
    peer.PresharedKey = assertWireGuardKey(options.presharedKey, "preshared key")
  }
  if (options.persistentKeepalive !== undefined) {
    peer.PersistentKeepalive = options.persistentKeepalive
  }
  Object.assign(peer, options.extraPeer)

  return stringify({ Interface: iface, Peers: [peer] })
}

/**
 * Generate a QR code for a client configuration. The default return value is
 * a PNG data URL; `terminal` prints an ANSI QR code; `outputPath` writes a
 * PNG file.
 */
const isClientConfigOptions = (
  value: WireGuardConfig | GenerateClientConfigOptions,
): value is GenerateClientConfigOptions =>
  typeof (value as GenerateClientConfigOptions).privateKey === "string" &&
  typeof (value as GenerateClientConfigOptions).serverPublicKey === "string"

export const generateClientQRCode = async (
  config: string | WireGuardConfig | GenerateClientConfigOptions,
  options: ClientQRCodeOptions = {},
): Promise<string> => {
  const text =
    typeof config === "string"
      ? config
      : isClientConfigOptions(config)
        ? generateClientConfig(config)
        : stringify(config)

  if (options.type === "terminal") {
    return QRCode.toString(text, { type: "terminal", small: true })
  }

  const qrOptions = { width: options.width ?? 512, errorCorrectionLevel: "M" as const }
  if (options.outputPath) {
    await mkdir(dirname(options.outputPath), { recursive: true })
    const buffer = await QRCode.toBuffer(text, { ...qrOptions, type: "png" })
    await writeFile(options.outputPath, buffer, { mode: 0o600 })
    return options.outputPath
  }

  return QRCode.toDataURL(text, qrOptions)
}
