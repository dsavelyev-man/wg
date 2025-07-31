import { readFile, writeFile } from "fs/promises"
import { parse } from "../parser/parse"
import { stringify } from "../parser/stringify"

export const deletePeer = async (filepath: string, where: {
    publicKey: string
}) => {
    const file = (await readFile(filepath)).toString()
    const parsed = parse(file)

    const index = parsed["Peers"].findIndex((item) => item.PublicKey === where.publicKey)

    if(index !== -1) {
        parsed["Peers"].splice(index, 1)

        const newFile = stringify(parsed)
        await writeFile(filepath, newFile)
    }
}