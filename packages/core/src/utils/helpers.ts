import { exec as execC } from "child_process"
import { promisify } from "util"

export const exec = promisify(execC)