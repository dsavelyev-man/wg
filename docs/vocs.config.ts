import { defineConfig } from 'vocs'

export default defineConfig({
  title: 'WireGuard Utils',
  description: 'A powerful TypeScript library for managing WireGuard VPN configurations',
  theme: {
    colorScheme: 'light',
  },
  // Suppress React warnings
  vite: {
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  },
  sidebar: [
    {
      text: 'Getting Started',
      link: '/getting-started',
    },
    {
      text: 'Configuration Management',
      items: [
        {
          text: 'Working with Configs',
          link: '/working-with-config',
        },
        {
          text: 'parse & stringify',
          link: '/parse-stringify',
        },
      ],
    },
    {
      text: 'Key Management',
      items: [
        {
          text: 'generateKeys',
          link: '/generate-keys',
        },
        {
          text: 'getPubKey',
          link: '/get-pubkey',
        },
      ],
    },
    {
      text: 'Peer Management',
      items: [
        {
          text: 'addPeer',
          link: '/add-peer',
        },
        {
          text: 'deletePeer',
          link: '/delete-peer',
        },
      ],
    },
    {
      text: 'Server Management',
      items: [
        {
          text: 'initConf',
          link: '/init-conf',
        },
        {
          text: 'Interface Control',
          link: '/interface-control',
        },
        {
          text: 'syncConf',
          link: '/sync-conf',
        },
      ],
    },
    {
      text: 'Installation & Setup',
      items: [
        {
          text: 'installWg',
          link: '/install-wg',
        },
        {
          text: 'getInstallInstructions',
          link: '/get-install-instructions',
        },
        {
          text: 'checkWg & requireWg',
          link: '/check-wg',
        },
      ],
    },
    {
      text: 'API Reference',
      link: '/api-reference',
    },
  ],
})
