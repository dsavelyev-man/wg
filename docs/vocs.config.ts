import { defineConfig } from 'vocs'

export default defineConfig({
  title: 'Docs',
  sidebar: [
    {
      text: 'Getting Started',
      link: '/getting-started',
    },
    {
      text: 'Touch configuration',
      link: '/working-with-config',
    },
    {
      text: 'addPeer',
      link: '/add-peer',
    },
  ],
})
