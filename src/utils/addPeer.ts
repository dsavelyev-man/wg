import { parse } from "../parser/parse"
import { readFile, writeFile  } from "fs/promises";
import { stringify } from "../parser/stringify";
import { down } from "./down";

const ipToNumber = (ip: string) => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

const numberToIp = (num: number) => {
  return [
    (num >> 24) & 255,
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255
  ].join('.');
}

const getNextIp = (currentIp: string) => {
  const num = ipToNumber(currentIp);
  const nextNum = num + 1;
  // Handle overflow if needed (optional)
  return numberToIp(nextNum);
}

export const addPeer = async (filepath: string, {
  publicKey
}: {
  publicKey: string;
}) =>{
    const file = (await readFile(filepath)).toString()
    const parsed = parse(file)
    let lastMax = {
        sum: 0,
        index: 0
    }

    parsed["Peers"].forEach((item, index) => {
        const ints = item["AllowedIPs"].replace("/32", "").split(".").map((item) => parseInt(item))
        ints[0] = ints[0] * 255 * 255 * 255
        ints[1] = ints[1] * 255 * 255
        ints[2] = ints[2] * 255

        const sum = ints.reduce((accum, item) => item + accum, 0)

        if(lastMax.sum <= sum) {
            lastMax = {
                sum,
                index
            }
        }
    })

    const nextIp = getNextIp(parsed["Peers"][lastMax.index]["AllowedIPs"].replace("/32", ""))
    const newPeer = {
        PublicKey: publicKey,
        AllowedIPs: `${nextIp}/32`,
    }

    parsed["Peers"].push(newPeer)

    const newFile = stringify(parsed)
    await writeFile(filepath, newFile)
}