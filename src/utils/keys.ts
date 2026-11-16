import { ConfigValidationError } from "../errors"

/** WireGuard keys are 32-byte base64 strings. */
export const isWireGuardKey = (value: string): boolean =>
  typeof value === "string" && /^[A-Za-z0-9+/]{43}=$/.test(value.trim())

export const assertWireGuardKey = (value: string, label = "WireGuard key"): string => {
  const normalized = value?.trim()
  if (!isWireGuardKey(normalized)) {
    throw new ConfigValidationError(`Invalid ${label}.`)
  }
  return normalized
}
