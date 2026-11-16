import { chmod, mkdir, writeFile } from "fs/promises"
import { dirname } from "path"
import { runWg } from "../commands"
import { assertWireGuardKey } from "./keys"

export interface GeneratePresharedKeyOptions {
  keyPath?: string
}

export interface GeneratedPresharedKey {
  presharedkey: string
  keyPath?: string
}

/**
 * Generate a preshared key in memory, optionally writing it to disk with mode
 * 0600.
 */
export const generatePresharedKey = async (
  options: GeneratePresharedKeyOptions = {},
): Promise<GeneratedPresharedKey> => {
  const presharedkey = assertWireGuardKey(
    (await runWg(["genpsk"])).stdout,
    "generated preshared key",
  )

  if (options.keyPath) {
    await mkdir(dirname(options.keyPath), { recursive: true })
    await writeFile(options.keyPath, `${presharedkey}\n`, { mode: 0o600 })
    await chmod(options.keyPath, 0o600)
  }

  return {
    presharedkey,
    ...(options.keyPath ? { keyPath: options.keyPath } : {}),
  }
}
