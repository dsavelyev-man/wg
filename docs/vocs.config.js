"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vocs_1 = require("vocs");
exports.default = (0, vocs_1.defineConfig)({
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
});
