/**
 * Parse WireGuard configuration text into a structured JavaScript object.
 *
 * The parser recognizes section headers like `[Interface]` and `[Peer]` and
 * collects key/value pairs under those sections. Each `[Peer]` section is
 * represented as an object and pushed into `config.Peers` (array). Lines that
 * are empty or start with `#` or `;` are ignored as comments.
 *
 * Output shape:
 * - `config.Interface?: Record<string, string>`
 * - `config.Peers?: Array<Record<string, string>>`
 *
 * @param text WireGuard configuration file contents
 * @returns Parsed configuration object
 *
 * @example
 * ```ts
 * const cfg = parse(`
 * [Interface]
 * PrivateKey = <server-private-key>
 * Address = 10.0.0.1/24
 *
 * [Peer]
 * PublicKey = <peer-pub>
 * AllowedIPs = 10.0.0.2/32
 * `)
 * console.log(cfg.Interface.Address) // "10.0.0.1/24"
 * ```
 */
export const parse = (text: string) => {
    const lines = text.split('\n');
  const config: any = {};
  let currentSection: null | string = null;
  
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) {
      // skip empty or comment lines
      continue;
    }
    
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1);
      if (currentSection === 'Peer') {
        if (!config.Peers) config.Peers = [];
        // start a new peer object
        config.Peers.push({});
      } else {
        config[currentSection] = {};
      }
    } else if (currentSection) {
      const [key, ...rest] = line.split('=');
      const value = rest.join('=').trim();
      if (currentSection === 'Peer') {
        const peers = config.Peers;
        const lastPeer = peers[peers.length - 1];
        lastPeer[key.trim()] = value;
      } else {
        config[currentSection][key.trim()] = value;
      }
    }
  }
  
  return config;
}