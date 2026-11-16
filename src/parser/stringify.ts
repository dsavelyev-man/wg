import { ConfigValidationError } from "../errors"
import { WireGuardConfig, WireGuardSection, WireGuardValue } from "../types"

const formatValue = (value: WireGuardValue): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ")
    return joined || undefined
  }
  const stringValue = String(value).trim()
  return stringValue || undefined
}

const stringifySection = (name: string, section: WireGuardSection): string => {
  const lines: string[] = [`[${name}]`]
  for (const [key, value] of Object.entries(section)) {
    const formatted = formatValue(value)
    if (formatted !== undefined) lines.push(`${key} = ${formatted}`)
  }
  return lines.join("\n")
}

/**
 * Convert a typed WireGuard configuration object into text.
 *
 * Undefined, null, and empty values are intentionally omitted. Arrays are
 * serialized as comma-separated WireGuard list values.
 */
export const stringify = (config: WireGuardConfig): string => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new ConfigValidationError("Configuration must be an object.")
  }

  const sections: string[] = []
  if (config.Interface) {
    sections.push(stringifySection("Interface", config.Interface))
  }

  if (config.Peers !== undefined) {
    if (!Array.isArray(config.Peers)) {
      throw new ConfigValidationError("config.Peers must be an array.")
    }
    for (const peer of config.Peers) {
      sections.push(stringifySection("Peer", peer))
    }
  }

  for (const [name, section] of Object.entries(config)) {
    if (name === "Interface" || name === "Peers" || section === undefined) continue
    if (Array.isArray(section)) {
      for (const item of section) sections.push(stringifySection(name, item))
    } else if (typeof section === "object" && section !== null) {
      sections.push(stringifySection(name, section))
    }
  }

  return sections.length > 0 ? `${sections.join("\n\n")}\n` : ""
}
