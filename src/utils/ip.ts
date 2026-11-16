import { AddressPoolExhaustedError, ConfigValidationError } from "../errors"
import { IpAddressFamily, PeerAddressAllocation, WireGuardConfig, WireGuardValue } from "../types"

export interface PeerAddressOptions {
  family?: IpAddressFamily
  /** Override the interface prefix used to choose a pool, for example `10.8.0.0/24`. */
  addressPool?: string
}

interface ParsedCidr {
  family: IpAddressFamily
  address: bigint
  prefix: number
}

export const parseIpv4 = (input: string): number => {
  const parts = input.trim().split(".")
  if (parts.length !== 4) {
    throw new ConfigValidationError(`Invalid IPv4 address: ${input}`)
  }

  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      throw new ConfigValidationError(`Invalid IPv4 address: ${input}`)
    }
    const octet = Number(part)
    if (octet < 0 || octet > 255) {
      throw new ConfigValidationError(`Invalid IPv4 address: ${input}`)
    }
    value = (value << 8) | octet
  }
  return value >>> 0
}

export const formatIpv4 = (value: number): string => {
  const unsigned = value >>> 0
  return [
    (unsigned >>> 24) & 255,
    (unsigned >>> 16) & 255,
    (unsigned >>> 8) & 255,
    unsigned & 255,
  ].join(".")
}

export const parseIpv6 = (input: string): bigint => {
  let address = input.trim().toLowerCase()
  address = address.split("%")[0]

  if (!address.includes(":")) {
    throw new ConfigValidationError(`Invalid IPv6 address: ${input}`)
  }

  if (address.includes(".")) {
    const lastColon = address.lastIndexOf(":")
    if (lastColon === -1) {
      throw new ConfigValidationError(`Invalid IPv6 address: ${input}`)
    }
    const ipv4 = parseIpv4(address.slice(lastColon + 1))
    address = `${address.slice(0, lastColon + 1)}${(ipv4 >>> 16).toString(16)}:${(ipv4 & 0xffff).toString(16)}`
  }

  const doubleColonParts = address.split("::")
  if (doubleColonParts.length > 2) {
    throw new ConfigValidationError(`Invalid IPv6 address: ${input}`)
  }

  const left = doubleColonParts[0] ? doubleColonParts[0].split(":") : []
  const right =
    doubleColonParts.length === 2 && doubleColonParts[1] ? doubleColonParts[1].split(":") : []
  const missing = 8 - left.length - right.length

  if (doubleColonParts.length === 1 && missing !== 0) {
    throw new ConfigValidationError(`Invalid IPv6 address: ${input}`)
  }
  if (doubleColonParts.length === 2 && missing < 1) {
    throw new ConfigValidationError(`Invalid IPv6 address: ${input}`)
  }

  const groups = [...left, ...Array(Math.max(0, missing)).fill("0"), ...right]
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    throw new ConfigValidationError(`Invalid IPv6 address: ${input}`)
  }

  return groups.reduce((acc, group) => (acc << 16n) + BigInt(parseInt(group, 16)), 0n)
}

export const formatIpv6 = (value: bigint): string => {
  if (value < 0n || value > (1n << 128n) - 1n) {
    throw new ConfigValidationError("IPv6 value is outside the 128-bit range")
  }

  const groups: string[] = []
  for (let index = 7; index >= 0; index -= 1) {
    groups.push(Number((value >> BigInt(index * 16)) & 0xffffn).toString(16))
  }

  let bestStart = -1
  let bestLength = 0
  for (let index = 0; index < groups.length; index += 1) {
    if (groups[index] !== "0") continue
    let end = index
    while (end < groups.length && groups[end] === "0") end += 1
    const length = end - index
    if (length > bestLength && length > 1) {
      bestStart = index
      bestLength = length
    }
    index = end - 1
  }

  if (bestStart === -1) return groups.join(":")
  const before = groups.slice(0, bestStart).join(":")
  const after = groups.slice(bestStart + bestLength).join(":")
  return `${before}::${after}`
}

const parseIp = (input: string): { family: IpAddressFamily; value: bigint } => {
  return input.includes(":")
    ? { family: "ipv6", value: parseIpv6(input) }
    : { family: "ipv4", value: BigInt(parseIpv4(input)) }
}

export const parseCidr = (input: string): ParsedCidr => {
  const [addressText, prefixText] = input.trim().split("/")
  if (!addressText || prefixText === undefined || !/^\d{1,3}$/.test(prefixText)) {
    throw new ConfigValidationError(`Invalid CIDR: ${input}`)
  }

  const parsed = parseIp(addressText)
  const prefix = Number(prefixText)
  const maxPrefix = parsed.family === "ipv4" ? 32 : 128
  if (prefix < 0 || prefix > maxPrefix) {
    throw new ConfigValidationError(`Invalid CIDR prefix: ${input}`)
  }

  return { family: parsed.family, address: parsed.value, prefix }
}

export const formatAddress = (family: IpAddressFamily, value: bigint): string =>
  family === "ipv4" ? formatIpv4(Number(value)) : formatIpv6(value)

const splitValues = (value: WireGuardValue): string[] => {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) return value.map(String).flatMap(splitValues)
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

const interfaceCidrs = (config: WireGuardConfig): ParsedCidr[] => {
  const addresses = splitValues(config.Interface?.Address)
  return addresses.map(parseCidr)
}

const collectUsedAddresses = (config: WireGuardConfig, family: IpAddressFamily): Set<bigint> => {
  const used = new Set<bigint>()
  for (const cidr of interfaceCidrs(config)) {
    if (cidr.family === family) used.add(cidr.address)
  }
  for (const peer of config.Peers ?? []) {
    for (const item of splitValues(peer.AllowedIPs)) {
      try {
        const cidr = parseCidr(item)
        if (cidr.family === family) used.add(cidr.address)
      } catch {
        // Invalid peer AllowedIPs are validated by the public config API.
      }
    }
  }
  return used
}

/**
 * Allocate the first free peer address from the interface subnet.
 * IPv4 peers receive a /32 and IPv6 peers receive a /128.
 */
export const getNextPeerAddress = (
  config: WireGuardConfig,
  options: PeerAddressOptions = {},
): PeerAddressAllocation => {
  const available = interfaceCidrs(config)
  const family =
    options.family ??
    available.find((item) => item.family === "ipv4")?.family ??
    available[0]?.family

  if (!family) {
    throw new ConfigValidationError(
      "Cannot allocate a peer address: [Interface] Address is missing.",
    )
  }

  const explicitPool = options.addressPool ? parseCidr(options.addressPool) : undefined
  if (explicitPool && explicitPool.family !== family) {
    throw new ConfigValidationError(`Address pool ${options.addressPool} does not match ${family}.`)
  }

  const pool = explicitPool ?? available.find((item) => item.family === family)
  if (!pool) {
    throw new ConfigValidationError(`No ${family} address pool found in [Interface] Address.`)
  }

  const bits = family === "ipv4" ? 32 : 128
  const hostBits = bits - pool.prefix
  const network = (pool.address >> BigInt(hostBits)) << BigInt(hostBits)
  const broadcast = network + (1n << BigInt(hostBits)) - 1n

  let first: bigint
  let last: bigint
  if (family === "ipv4" && pool.prefix <= 30) {
    first = network + 1n
    last = broadcast - 1n
  } else if (family === "ipv4" && pool.prefix === 31) {
    first = network
    last = broadcast
  } else if (family === "ipv4") {
    throw new AddressPoolExhaustedError(
      `IPv4 pool ${formatAddress(family, network)}/${pool.prefix} has no peer addresses.`,
    )
  } else {
    first = network + 1n
    last = broadcast
  }

  if (first > last) {
    throw new AddressPoolExhaustedError(
      `Address pool ${formatAddress(family, network)}/${pool.prefix} is exhausted.`,
    )
  }

  const used = collectUsedAddresses(config, family)
  const maxUsed =
    used.size > 0 ? [...used].reduce((max, item) => (item > max ? item : max)) : first - 1n
  let candidate = maxUsed + 1n > first ? maxUsed + 1n : first
  if (candidate > last) candidate = first

  const total = last - first + 1n
  const maxAttempts = total < 2_000_000n ? Number(total) : 2_000_000
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!used.has(candidate)) {
      const prefix = family === "ipv4" ? 32 : 128
      const ip = formatAddress(family, candidate)
      return {
        address: `${ip}/${prefix}`,
        ip,
        cidr: String(prefix),
        family,
      }
    }
    candidate = candidate === last ? first : candidate + 1n
  }

  throw new AddressPoolExhaustedError(
    `No free peer address found in ${formatAddress(family, network)}/${pool.prefix}.`,
  )
}

export const isValidIp = (input: string): boolean => {
  try {
    parseIp(input)
    return true
  } catch {
    return false
  }
}

export const isValidCidr = (input: string): boolean => {
  try {
    parseCidr(input)
    return true
  } catch {
    return false
  }
}
