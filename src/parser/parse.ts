import { ConfigParseError } from "../errors"
import { WireGuardConfig, WireGuardPeer, WireGuardSection } from "../types"

const SECTION_NAMES: Record<string, string> = {
  interface: "Interface",
  peer: "Peer",
}

const appendValue = (section: WireGuardSection, key: string, value: string): void => {
  const existing = section[key]
  if (existing === undefined) {
    section[key] = value
    return
  }
  if (Array.isArray(existing)) {
    section[key] = [...existing, value]
    return
  }
  section[key] = `${existing}, ${value}`
}

/**
 * Parse WireGuard configuration text into a typed object.
 *
 * Comments and blank lines are ignored. Repeated keys inside a section are
 * merged using a comma, which matches WireGuard list syntax. Invalid non-empty
 * lines and empty values raise `ConfigParseError` instead of being silently
 * discarded.
 */
export const parse = (text: string): WireGuardConfig => {
  if (typeof text !== "string") {
    throw new ConfigParseError("Configuration text must be a string.")
  }

  const config: WireGuardConfig = {}
  let currentSection: WireGuardSection | undefined
  let currentPeer: WireGuardPeer | undefined
  let currentSectionName: string | undefined

  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const original = lines[index]
    const line = original.trim()
    if (!line || line.startsWith("#") || line.startsWith(";")) continue

    if (line.startsWith("[")) {
      const match = line.match(/^\[\s*([A-Za-z0-9_-]+)\s*\]$/)
      if (!match) {
        throw new ConfigParseError(`Invalid section header on line ${index + 1}: ${original}`)
      }

      const rawSectionName = match[1]
      currentSectionName = SECTION_NAMES[rawSectionName.toLowerCase()] ?? rawSectionName
      if (currentSectionName === "Peer") {
        if (!Array.isArray(config.Peers)) config.Peers = []
        currentPeer = {}
        config.Peers.push(currentPeer)
        currentSection = currentPeer
      } else {
        const existing = config[currentSectionName]
        if (existing && !Array.isArray(existing)) {
          currentSection = existing
        } else {
          currentSection = {}
          config[currentSectionName] = currentSection
        }
        currentPeer = undefined
      }
      continue
    }

    if (!currentSection || !currentSectionName) {
      throw new ConfigParseError(
        `Configuration value appears before a section on line ${index + 1}: ${original}`,
      )
    }

    const equalsIndex = line.indexOf("=")
    if (equalsIndex <= 0) {
      throw new ConfigParseError(`Invalid configuration line ${index + 1}: ${original}`)
    }

    const key = line.slice(0, equalsIndex).trim()
    const value = line.slice(equalsIndex + 1).trim()
    if (!key) {
      throw new ConfigParseError(`Missing key on line ${index + 1}: ${original}`)
    }
    if (!value) {
      throw new ConfigParseError(`Missing value for ${key} on line ${index + 1}.`)
    }

    appendValue(currentSection, key, value)
  }

  return config
}
