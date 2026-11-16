import { mkdtemp, readFile, rm } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { afterEach, describe, expect, it } from "vitest"
import { runCommand } from "../src/commands"

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe("runCommand", () => {
  it("passes arguments literally instead of through a shell", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wg-utils-command-"))
    dirs.push(dir)
    const target = join(dir, "injected")
    const script = "process.stdout.write(process.argv.slice(1).join('|'))"
    const result = await runCommand(process.execPath, [
      "-e",
      script,
      "hello world",
      `;touch ${target}`,
    ])

    expect(result.stdout).toContain("hello world|;touch ")
    await expect(readFile(target)).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("sends stdin without shell interpolation", async () => {
    const result = await runCommand(
      process.execPath,
      ["-e", "process.stdin.pipe(process.stdout)"],
      { input: "key with spaces\n" },
    )
    expect(result.stdout).toBe("key with spaces\n")
  })
})
