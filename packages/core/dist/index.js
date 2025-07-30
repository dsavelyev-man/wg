"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const parse_1 = require("./parser/parse");
const test = async () => {
    const file = (await (0, promises_1.readFile)("./tests/wg0.conf")).toString();
    console.log(file);
    (0, parse_1.parse)(file);
};
test();
