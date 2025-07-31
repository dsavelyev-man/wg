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