import { readFile } from "fs/promises"
import { runWg } from "../commands"
import { ConfigValidationError } from "../errors"
import { parse } from "../parser/parse"
import { assertWireGuardKey } from "./keys"

/** Derive a public key from a private key using stdin only. */
export const getPublicKey = async (privateKey: string): Promise<string> => {
  const normalized = assertWireGuardKey(privateKey, "private key")
  return assertWireGuardKey(
    (await runWg(["pubkey"], { input: `${normalized}\n` })).stdout,
    "public key",
  )
}

/**
 * Derive the public key belonging to `Interface.PrivateKey` in a config file.
 */
export const getPubKey = async (filepath: string): Promise<{ publicKey: string }> => {
  const config = parse(await readFile(filepath, "utf8"))
  const privateKey = config.Interface?.PrivateKey
  if (typeof privateKey !== "string" || !privateKey.trim()) {
    throw new ConfigValidationError("Interface.PrivateKey is missing.")
  }
  return { publicKey: await getPublicKey(privateKey) }
}
