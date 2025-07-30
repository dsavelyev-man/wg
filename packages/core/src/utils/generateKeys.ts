import { readFile } from "fs/promises"
import { exec } from "./helpers"

export const generateKeys = async () => {
    const script = await exec("umask 077 && wg genkey | tee privatekey | wg pubkey > publickey")
    if(script.stderr) {
        console.error("Error generating keys:", script.stderr)
        throw new Error("Failed to generate keys")
    } else {
        const publickey = await readFile("publickey", "utf8")
        const privatekey = await readFile("privatekey", "utf8")
        
        return {
            publicKey: publickey.trim(),
            privateKey: privatekey.trim()
        }
    }

}