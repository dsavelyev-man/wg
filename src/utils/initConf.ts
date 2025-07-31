import { writeFile } from "fs/promises"
import { stringify } from "../parser/stringify"

export const initConf = async (filepath: string, options: {
    port?: number
    ip?: string,
    privateKey: string
    interface?: string
}) => {
    const Interface = {
        Address: `${options.ip || "10.0.0.1"}/24`,
        ListenPort: options.port || 51820,
        PrivateKey: options.privateKey,
        PostUp: `iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o ${options.interface || "eth0"} -j MASQUERADE`,
        PostDown: `iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o ${options.interface || "eth0"} -j MASQUERADE`
    }

    const newFile = stringify({
        Interface
    })
    await writeFile(filepath, newFile)
}