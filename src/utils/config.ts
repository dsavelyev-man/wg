import { chmod, copyFile, mkdir, readFile, rename, unlink, writeFile } from "fs/promises"
import { basename, dirname, join } from "path"
import { ConfigValidationError, PeerAlreadyExistsError, PeerNotFoundError } from "../errors"
import { parse } from "../parser/parse"
import { stringify } from "../parser/stringify"
import {
  ConfigWriteOptions,
  SyncOptions,
  WireGuardConfig,
  WireGuardPeer,
  WireGuardValue,
} from "../types"
import { isValidCidr, isValidIp } from "./ip"
import { syncAfterConfigChange } from "./syncAfterConfigChange"

const DISABLED_PREFIX = "#wg-utils: "

const splitList = (value: WireGuardValue): string[] => {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) return value.flatMap(splitList)
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

const isSectionLine = (line: string): boolean => {
  const trimmed = line.trim()
  return /^\[[^\]]+\]$/.test(trimmed) || /^#wg-utils:\s*\[[^\]]+\]$/.test(trimmed)
}

const sectionText = (line: string): string => line.trim().replace(DISABLED_PREFIX, "")

const extractPublicKey = (lines: string[], start: number, end: number): string | undefined => {
  for (let index = start; index < end; index += 1) {
    const line = lines[index].trim().replace(DISABLED_PREFIX, "")
    const match = line.match(/^PublicKey\s*=\s*(.+)$/i)
    if (match) return match[1].trim()
  }
  return undefined
}

const findPeerBlock = (
  lines: string[],
  publicKey: string,
): { start: number; end: number; enabled: boolean } | undefined => {
  for (let index = 0; index < lines.length; index += 1) {
    if (!isSectionLine(lines[index])) continue
    if (sectionText(lines[index]).toLowerCase() !== "[peer]") continue

    let end = index + 1
    while (end < lines.length && !isSectionLine(lines[end])) end += 1
    if (extractPublicKey(lines, index, end) === publicKey) {
      return { start: index, end, enabled: !lines[index].trim().startsWith(DISABLED_PREFIX) }
    }
    index = end - 1
  }
  return undefined
}

const replaceFile = async (
  filepath: string,
  content: string,
  options: ConfigWriteOptions = {},
): Promise<void> => {
  const directory = dirname(filepath)
  if (options.createDirectory !== false) {
    await mkdir(directory, { recursive: true })
  }

  if (options.backup) {
    try {
      await copyFile(filepath, `${filepath}.bak-${Date.now()}`)
    } catch (error: any) {
      if (error?.code !== "ENOENT") throw error
    }
  }

  const mode = options.mode ?? 0o600
  const tempPath = join(
    directory,
    `.${basename(filepath)}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`,
  )

  try {
    await writeFile(tempPath, content, { mode })
    await chmod(tempPath, mode)
    await rename(tempPath, filepath)
    await chmod(filepath, mode)
  } catch (error) {
    try {
      await unlink(tempPath)
    } catch {
      // Ignore cleanup errors.
    }
    throw error
  }
}

export const validateWireGuardConfig = (config: WireGuardConfig): void => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new ConfigValidationError("Configuration must be an object.")
  }

  if (config.Interface) {
    const addresses = splitList(config.Interface.Address)
    for (const address of addresses) {
      if (!isValidCidr(address)) {
        throw new ConfigValidationError(`Invalid Interface Address: ${address}`)
      }
    }

    if (config.Interface.ListenPort !== undefined) {
      const port = Number(config.Interface.ListenPort)
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new ConfigValidationError(`Invalid ListenPort: ${config.Interface.ListenPort}`)
      }
    }

    if (config.Interface.PrivateKey !== undefined && !String(config.Interface.PrivateKey).trim()) {
      throw new ConfigValidationError("Interface PrivateKey cannot be empty.")
    }
  }

  if (config.Peers !== undefined && !Array.isArray(config.Peers)) {
    throw new ConfigValidationError("Peers must be an array.")
  }

  const seen = new Set<string>()
  for (const [index, peer] of (config.Peers ?? []).entries()) {
    const publicKey = peer.PublicKey === undefined ? "" : String(peer.PublicKey).trim()
    if (!publicKey) {
      throw new ConfigValidationError(`Peer ${index + 1} is missing PublicKey.`)
    }
    if (seen.has(publicKey)) {
      throw new PeerAlreadyExistsError(`Duplicate peer PublicKey: ${publicKey}`)
    }
    seen.add(publicKey)

    for (const allowedIp of splitList(peer.AllowedIPs)) {
      if (!isValidCidr(allowedIp)) {
        throw new ConfigValidationError(`Invalid AllowedIPs entry for ${publicKey}: ${allowedIp}`)
      }
    }

    if (peer.Endpoint !== undefined) {
      const endpoint = String(peer.Endpoint)
      const host = endpoint.startsWith("[")
        ? endpoint.slice(1, endpoint.indexOf("]"))
        : endpoint.slice(0, endpoint.lastIndexOf(":"))
      if (!host || !endpoint.includes(":")) {
        throw new ConfigValidationError(`Invalid peer Endpoint: ${endpoint}`)
      }
    }

    if (peer.PersistentKeepalive !== undefined) {
      const keepalive = Number(peer.PersistentKeepalive)
      if (!Number.isInteger(keepalive) || keepalive < 0) {
        throw new ConfigValidationError(`Invalid PersistentKeepalive: ${peer.PersistentKeepalive}`)
      }
    }
  }
}

export const getInterfaceName = (filepath: string): string =>
  basename(filepath).replace(/\.conf$/i, "")

export const readConfig = async (filepath: string): Promise<WireGuardConfig> =>
  parse(await readFile(filepath, "utf8"))

export const writeConfig = async (
  filepath: string,
  config: WireGuardConfig,
  options: ConfigWriteOptions = {},
): Promise<string> => {
  validateWireGuardConfig(config)
  const content = stringify(config)
  await replaceFile(filepath, content, options)
  return content
}

export const listPeers = async (filepath: string): Promise<WireGuardPeer[]> =>
  (await readConfig(filepath)).Peers ?? []

export const getPeer = async (
  filepath: string,
  publicKey: string,
): Promise<WireGuardPeer | undefined> => {
  const normalized = publicKey.trim()
  return (await listPeers(filepath)).find((peer) => String(peer.PublicKey).trim() === normalized)
}

export const updatePeer = async (
  filepath: string,
  publicKey: string,
  changes: Record<string, WireGuardValue>,
  options: ConfigWriteOptions & SyncOptions = {},
): Promise<WireGuardPeer> => {
  const content = await readFile(filepath, "utf8")
  const lines = content.split(/\r?\n/)
  const block = findPeerBlock(lines, publicKey.trim())
  if (!block) throw new PeerNotFoundError(`Peer not found: ${publicKey}`)

  const missing: string[] = []
  for (const [rawKey, value] of Object.entries(changes)) {
    const key = rawKey.trim()
    const remove = value === null || value === undefined || value === ""
    const formatted = Array.isArray(value)
      ? value
          .map(String)
          .map((item) => item.trim())
          .filter(Boolean)
          .join(", ")
      : value === null || value === undefined
        ? ""
        : String(value).trim()
    let found = false

    for (let index = block.start + 1; index < block.end; index += 1) {
      const match = lines[index].match(/^(\s*)([^=;#]+?)(\s*)=(.*)$/)
      if (!match || match[2].trim().toLowerCase() !== key.toLowerCase()) continue
      found = true
      lines[index] = remove ? "" : `${match[1]}${match[2].trim()} = ${formatted}`
    }

    if (!found && !remove) missing.push(`${key} = ${formatted}`)
  }

  let insertAt = block.end
  while (insertAt > block.start + 1 && !lines[insertAt - 1].trim()) insertAt -= 1
  if (missing.length > 0) lines.splice(insertAt, 0, ...missing)

  const updated = lines.join("\n")
  const parsed = parse(updated)
  validateWireGuardConfig(parsed)
  await replaceFile(filepath, updated, options)
  await syncAfterConfigChange(filepath, options)

  const targetKey =
    changes.PublicKey === undefined || changes.PublicKey === null
      ? publicKey.trim()
      : String(changes.PublicKey).trim()
  const peer = (parsed.Peers ?? []).find((item) => String(item.PublicKey).trim() === targetKey)
  if (!peer) throw new PeerNotFoundError(`Peer not found after update: ${targetKey}`)
  return peer
}

export const appendPeer = async (
  filepath: string,
  peer: WireGuardPeer,
  options: ConfigWriteOptions = {},
): Promise<void> => {
  const config = await readConfig(filepath)
  const candidate = addPeerToConfig({ ...config, Peers: [...(config.Peers ?? [])] }, peer)
  validateWireGuardConfig(candidate)
  const existing = await readFile(filepath, "utf8")
  const separator = existing.endsWith("\n") ? "\n" : "\n\n"
  const block = stringify({ Peers: [peer] }).trimEnd()
  await replaceFile(filepath, `${existing}${separator}${block}\n`, options)
}

export const addPeerToConfig = (config: WireGuardConfig, peer: WireGuardPeer): WireGuardConfig => {
  const publicKey = String(peer.PublicKey ?? "").trim()
  if (!publicKey) throw new ConfigValidationError("A peer PublicKey is required.")
  if ((config.Peers ?? []).some((item) => String(item.PublicKey).trim() === publicKey)) {
    throw new PeerAlreadyExistsError(`Peer already exists: ${publicKey}`)
  }
  config.Peers = [...(config.Peers ?? []), peer]
  return config
}

const collectDisabledPeers = (lines: string[]): WireGuardPeer[] => {
  const peers: WireGuardPeer[] = []
  for (const line of lines) {
    if (!line.trim().startsWith(DISABLED_PREFIX)) continue
    const content = line.trim().slice(DISABLED_PREFIX.length).trim()
    if (!content || content.startsWith("[") || content.startsWith("#") || content.startsWith(";")) {
      continue
    }
    const equalsIndex = content.indexOf("=")
    if (equalsIndex <= 0) continue
    const key = content.slice(0, equalsIndex).trim()
    const value = content.slice(equalsIndex + 1).trim()
    if (!value) continue

    if (key.toLowerCase() === "publickey") {
      peers.push({ PublicKey: value })
    } else if (peers.length > 0) {
      peers[peers.length - 1][key] = value
    }
  }
  return peers
}

export const listDisabledPeers = async (filepath: string): Promise<WireGuardPeer[]> =>
  collectDisabledPeers((await readFile(filepath, "utf8")).split(/\r?\n/))

export const setPeerEnabled = async (
  filepath: string,
  publicKey: string,
  enabled: boolean,
  options: ConfigWriteOptions & SyncOptions = {},
): Promise<boolean> => {
  const content = await readFile(filepath, "utf8")
  const lines = content.split(/\r?\n/)
  const block = findPeerBlock(lines, publicKey.trim())
  if (!block) {
    const state = enabled ? "active" : "disabled"
    throw new PeerNotFoundError(`Peer is not present as ${state}: ${publicKey}`)
  }
  if (block.enabled === enabled) return false

  for (let index = block.start; index < block.end; index += 1) {
    const line = lines[index]
    if (!line.trim()) continue
    if (enabled) {
      if (line.startsWith(DISABLED_PREFIX)) {
        lines[index] = line.slice(DISABLED_PREFIX.length)
      }
    } else if (!line.startsWith(DISABLED_PREFIX)) {
      lines[index] = `${DISABLED_PREFIX}${line}`
    }
  }

  await replaceFile(filepath, lines.join("\n"), options)
  await syncAfterConfigChange(filepath, options)
  return true
}

export const removePeer = async (
  filepath: string,
  publicKey: string,
  options: ConfigWriteOptions & SyncOptions = {},
): Promise<boolean> => {
  const content = await readFile(filepath, "utf8")
  const lines = content.split(/\r?\n/)
  const block = findPeerBlock(lines, publicKey.trim())
  if (!block) return false

  lines.splice(block.start, block.end - block.start)
  await replaceFile(filepath, lines.join("\n"), options)
  await syncAfterConfigChange(filepath, options)
  return true
}

export const assertValidIp = (ip: string): void => {
  if (!isValidIp(ip)) throw new ConfigValidationError(`Invalid IP address: ${ip}`)
}

export const interfaceNameFromConfigPath = getInterfaceName
