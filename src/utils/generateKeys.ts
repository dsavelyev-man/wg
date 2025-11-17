import { readFile } from "fs/promises"
import { exec } from "./helpers"

/**
 * Generate a WireGuard key pair (private and public keys).
 *
 * This function uses WireGuard CLI tools to securely create a private key
 * and derive its corresponding public key. Files are written with a
 * restrictive umask (077) to ensure safe permissions.
 *
 * Notes:
 * - Requires `wg` tools to be installed and available on PATH.
 * - By default, keys are written to `/etc/wireguard/privatekey` and
 *   `/etc/wireguard/publickey`.
 * - The returned keys are also read from disk and trimmed.
 *
 * @param options Optional paths for storing generated keys. (Currently
 *                unused in the implementation and defaults are used.)
 * @param options.privateKeyPath Optional path to write the private key
 * @param options.publicKeyPath Optional path to write the public key
 * @returns Promise resolving to `{ publicKey: string, privateKey: string }`.
 * @throws If the `wg` command fails or files cannot be read/written.
 *
 * @example
 * ```ts
 * import { generateKeys } from "@kriper0nind/wg-utils"
 * const { publicKey, privateKey } = await generateKeys()
 * console.log(publicKey)
 * ```
 */
export const generateKeys = async (options: {
    privateKeyPath?: string
    publicKeyPath?: string
} = {}) => {
    const privateKeyPath = options.privateKeyPath || "/etc/wireguard/privatekey"
    const publicKeyPath = options.publicKeyPath || "/etc/wireguard/publickey"
    const script = await exec(`umask 077 && wg genkey > ${privateKeyPath}&& wg pubkey < /etc/wireguard/privatekey > ${publicKeyPath}`)
    if(script.stderr) {
        console.error("Error generating keys:", script.stderr)
        throw new Error("Failed to generate keys")
    } else {
        const publickey = await readFile(publicKeyPath, "utf8")
        const privatekey = await readFile(privateKeyPath, "utf8")
        
        return {
            publicKey: publickey.trim(),
            privateKey: privatekey.trim()
        }
    }

}
