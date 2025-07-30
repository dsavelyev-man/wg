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