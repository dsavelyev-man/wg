import { exec } from "child_process"
import { readFile } from "fs/promises"
import { parse } from "../parser/parse"

/**
 * Derive a WireGuard public key from the private key stored in the
 * WireGuard configuration file's [Interface] section.
 *
 * This function reads the config file, parses it to extract
 * Interface.PrivateKey, and then pipes it through `wg pubkey` to
 * obtain the corresponding public key.
 *
 * Security notes:
 * - The private key is never logged or returned.
 * - Requires `wg` tools to be installed and available on PATH.
 * - Ensure the config file has appropriate permissions (e.g., 600).
 *
 * @param filepath Absolute path to the WireGuard config file (e.g.,
 * `/etc/wireguard/wg0.conf`).
 * @returns Promise that resolves with `{ publicKey: string }`.
 * @throws If the file cannot be read, the config is malformed, the
 * Interface.PrivateKey is missing, or `wg pubkey` fails.
 *
 * @example
 * ```ts
 * import { getPubKey } from "@kriper0nind/wg-utils"
 * const { publicKey } = await getPubKey("/etc/wireguard/wg0.conf")
 * console.log(publicKey)
 * ```
 */
export const getPubKey = async (filepath: string): Promise<{
    publicKey: string
}> => {
    const parsed = parse((await readFile(filepath)).toString())

    const publicKey = await (new Promise((res, rej) => {
        exec(`echo \"${parsed["Interface"]["PrivateKey"]}\" \| wg pubkey`, (err, stdout, stderr) => {
            if(stderr) {
                console.error("Error extracting public key", stderr)
                throw new Error("Failed to extract public key")
            }
            res(stdout.trim())
        })
    }))

    return {
        publicKey: publicKey as string
    }
}
