import { chmod, mkdir, writeFile } from "fs/promises"
import { dirname } from "path"
import { runWg } from "../commands"
import { assertWireGuardKey } from "./keys"

export interface GenerateKeysOptions {
  privateKeyPath?: string
  publicKeyPath?: string
}

export interface GeneratedKeys {
  publicKey: string
  privateKey: string
  privateKeyPath?: string
  publicKeyPath?: string
}

const writeSecret = async (filepath: string, value: string): Promise<void> => {
  await mkdir(dirname(filepath), { recursive: true })
  await writeFile(filepath, `${value}\n`, { mode: 0o600 })
  await chmod(filepath, 0o600)
}

/**
 * Generate a WireGuard key pair using `wg genkey` and `wg pubkey`.
 *
 * Keys are kept in memory by default. Passing paths writes each key with mode
 * 0600. The private key is sent to `wg pubkey` through stdin, never through a
 * shell command.
 */
export const generateKeys = async (options: GenerateKeysOptions = {}): Promise<GeneratedKeys> => {
  const privateKey = assertWireGuardKey((await runWg(["genkey"])).stdout, "generated private key")
  const publicKey = assertWireGuardKey(
    (await runWg(["pubkey"], { input: `${privateKey}\n` })).stdout,
    "generated public key",
  )

  if (options.privateKeyPath) await writeSecret(options.privateKeyPath, privateKey)
  if (options.publicKeyPath) await writeSecret(options.publicKeyPath, publicKey)

  return {
    publicKey,
    privateKey,
    ...(options.privateKeyPath ? { privateKeyPath: options.privateKeyPath } : {}),
    ...(options.publicKeyPath ? { publicKeyPath: options.publicKeyPath } : {}),
  }
}
