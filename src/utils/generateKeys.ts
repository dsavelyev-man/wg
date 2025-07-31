import { readFile } from "fs/promises"
import { exec } from "./helpers"

export const generateKeys = async (options: {
    privateKeyPath?: string
    publicKeyPath?: string
} = {}) => {
    const script = await exec("umask 077 && wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey")
    if(script.stderr) {
        console.error("Error generating keys:", script.stderr)
        throw new Error("Failed to generate keys")
    } else {
        const publickey = await readFile("/etc/wireguard/publickey", "utf8")
        const privatekey = await readFile("/etc/wireguard/privatekey", "utf8")
        
        return {
            publicKey: publickey.trim(),
            privateKey: privatekey.trim()
        }
    }

}