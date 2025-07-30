import { exec } from "./helpers"

export const generateKeys = async () => {
    const script = await exec("umask 077")

    console.log(script)
}