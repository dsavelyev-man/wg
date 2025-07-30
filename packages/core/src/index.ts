import { readFile } from "fs/promises"
import { parse } from "./parser/parse"
import { stringify } from "./parser/stringify"
import { addPeer } from "./utils/addPeer"
import { generateKeys } from "./utils/generateKeys"

const test = async () => {
    const file = (await addPeer("./tests/wg0.conf"))
    const keys = generateKeys()
}

test()