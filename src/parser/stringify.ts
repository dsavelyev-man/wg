/**
 * Convert a parsed WireGuard configuration object into its textual
 * WireGuard config representation.
 *
 * The function supports an `Interface` object and a `Peers` array where each
 * peer is an object of key/value pairs. Keys and values are emitted in the
 * order returned by `Object.entries`.
 *
 * Expected input shape:
 * - `config.Interface?: Record<string, string | number>`
 * - `config.Peers?: Array<Record<string, string | number>>`
 *
 * @param config Parsed configuration object
 * @returns WireGuard configuration text (without trailing newline)
 *
 * @example
 * ```ts
 * const text = stringify({
 *   Interface: {
 *     PrivateKey: "<server-private-key>",
 *     Address: "10.0.0.1/24",
 *     ListenPort: 51820,
 *   },
 *   Peers: [
 *     { PublicKey: "<peer-pub>", AllowedIPs: "10.0.0.2/32" },
 *   ],
 * })
 * ```
 */
export const stringify = (config: any) => {
    let result = '';

    // Handle Interface section
    if (config.Interface) {
        result += '[Interface]\n';
        for (const [key, value] of Object.entries(config.Interface)) {
        result += `${key} = ${value}\n`;
        }
        result += '\n';
    }

    // Handle Peers array
    if (Array.isArray(config.Peers)) {
        for (const peer of config.Peers) {
        result += '[Peer]\n';
        for (const [key, value] of Object.entries(peer)) {
            result += `${key} = ${value}\n`;
        }
        result += '\n';
        }
    }

    return result.trim();
}