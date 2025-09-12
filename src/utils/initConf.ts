import { writeFile } from "fs/promises"
import { stringify } from "../parser/stringify"

/**
 * Create an initial WireGuard server configuration file.
 *
 * This function generates a minimal, production-ready `[Interface]` section
 * including Address, ListenPort, PrivateKey and PostUp/PostDown iptables
 * rules for NAT/masquerading. The resulting configuration is written to the
 * provided filepath and is ready for use with `wg-quick up`.
 *
 * @param filepath Absolute path where the config will be written
 * (e.g., `/etc/wireguard/wg0.conf`).
 * @param options Configuration options
 * @param options.privateKey Server private key (required)
 * @param options.port UDP listen port, defaults to 51820
 * @param options.ip Server address prefix (no CIDR), defaults to `10.0.0.1`
 * @param options.interface Outbound interface for NAT, defaults to `eth0`
 * @returns Promise that resolves when the file has been written
 * @throws If the file cannot be written (e.g., permissions/IO errors)
 *
 * @example
 * ```ts
 * import { initConf } from "@kriper0nind/wg-utils"
 *
 * await initConf("/etc/wireguard/wg0.conf", {
 *   privateKey: "<server-private-key>",
 *   port: 51820,
 *   ip: "10.0.0.1",
 *   interface: "eth0"
 * })
 * // Now you can run: wg-quick up wg0
 * ```
 */
export const initConf = async (filepath: string, options: {
    port?: number
    ip?: string,
    privateKey: string
    interface?: string
}) => {
    const Interface = {
        Address: `${options.ip || "10.0.0.1"}/24`,
        ListenPort: options.port || 51820,
        PrivateKey: options.privateKey,
        PostUp: `iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o ${options.interface || "eth0"} -j MASQUERADE`,
        PostDown: `iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o ${options.interface || "eth0"} -j MASQUERADE`
    }

    const newFile = stringify({
        Interface
    })
    await writeFile(filepath, newFile)
}