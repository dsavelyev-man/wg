import { readFile } from "fs/promises"
import { exec } from "./helpers"

/**
 * Generate a WireGuard preshared key (PSK) using `wg genpsk`.
 *
 * Preshared keys add an extra layer of symmetric encryption on top of the
 * standard WireGuard public/private key pairs and can be attached to peers via
 * `addPeer({ presharedKey })`.
 *
 * @param options Optional generation options.
 * @param options.keyPath Optional path where the PSK should be written.
 * Defaults to `/etc/wireguard/presharedkey`. The file is created/overwritten
 * using the current process permissions, so run as root for system paths.
 * @returns Promise resolving to `{ presharedkey: string }` with the trimmed PSK.
 * @throws If the underlying `wg genpsk` command fails or the file cannot be
 * read after generation.
 *
 * @example
 * ```ts
 * const { presharedkey } = await generatePresharedKey()
 * await addPeer("/etc/wireguard/wg0.conf", {
 *   publicKey: clientKeys.publicKey,
 *   presharedKey: presharedkey
 * })
 * ```
 */
export const generatePresharedKey = async (options: {
    keyPath?: string
} = {}) => {
    const keyPath = options.keyPath || "/etc/wireguard/presharedkey"
    const script = await exec(`wg genpsk > ${keyPath}`)
    if(script.stderr) {
        console.error("Error generating preshared key:", script.stderr)
        throw new Error("Failed to generate preshared keys")
    } else {
        const presharedkey = await readFile(keyPath, "utf8")
        
        return {
            presharedkey: presharedkey.trim(),
        }
    }

}
