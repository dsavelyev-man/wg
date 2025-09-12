import { readFile, writeFile } from "fs/promises"
import { parse } from "../parser/parse"
import { stringify } from "../parser/stringify"

/**
 * Remove a peer from a WireGuard configuration file by its public key.
 *
 * Reads the configuration, finds the matching `[Peer]` entry where
 * `PublicKey === where.publicKey`, removes it, and writes the updated
 * configuration back to disk.
 *
 * Notes:
 * - If the peer is not found, the function resolves without changing the file.
 * - Ensure the process has write permissions to the target config file.
 *
 * @param filepath Absolute path to the WireGuard config file
 * (e.g., `/etc/wireguard/wg0.conf`).
 * @param where Selection criteria containing the peer `publicKey`.
 * @returns Promise that resolves when the operation completes.
 * @throws If the file cannot be read or written, or the config cannot be parsed.
 *
 * @example
 * ```ts
 * import { deletePeer } from "@kriper0nind/wg-utils"
 *
 * await deletePeer("/etc/wireguard/wg0.conf", {
 *   publicKey: "<peer-public-key>"
 * })
 * ```
 */
export const deletePeer = async (filepath: string, where: {
    publicKey: string
}) => {
    const file = (await readFile(filepath)).toString()
    const parsed = parse(file)

    const index = parsed["Peers"].findIndex((item) => item.PublicKey === where.publicKey)

    if(index !== -1) {
        parsed["Peers"].splice(index, 1)

        const newFile = stringify(parsed)
        await writeFile(filepath, newFile)
    }
}