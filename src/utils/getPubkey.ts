import { exec } from "child_process"
import { readFile } from "fs/promises"
import { parse } from "../parser/parse"

export const getPubKey = async (filepath: string): Promise<{
    publicKey: string
}> => {
    const parsed = parse((await readFile(filepath)).toString())

    const publicKey = await (new Promise((res, rej) => {
        exec(`echo \"${parsed["Interface"]["PrivateKey"]}\" \| wg pubkey`, (err, stdout, stderr) => {
            if(stderr) {
                console.error("Error extracting public key", stderr)
                throw new Error("Failed to extract public key")
            }
            res(stdout.trim())
        })
    }))

    return {
        publicKey: publicKey as string
    }
}
