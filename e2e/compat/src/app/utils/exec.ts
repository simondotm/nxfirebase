import { PACKAGE_MANAGER } from '../config'
import { info, log } from './log'
import { exec } from 'child_process'

/**
 * Promisify node `exec`, with stdout & stderr piped to console
 * @param command
 * @param dir - defaults to cwd if not specified
 * @returns
 */
export async function customExec(
  command: string,
  dir?: string,
): Promise<{ stdout: string; stderr: string }> {
  const cwd = dir ? dir : process.cwd()
  return new Promise((resolve, reject) => {
    info(`Executing command '${command}' in '${cwd}'`)
    const process = exec(
      command,
      { cwd: cwd },
      //      { cwd: cwd, env: { NX_DAEMON: 'false' } }, // force CI type environment so Nx Daemon doesn't act up with multiple instances
      // { cwd: cwd, env: { CI: 'true' } }, // force CI type environment so Nx Daemon doesn't act up with multiple instances
      (error, stdout, stderr) => {
        if (error) {
          console.warn(error.message)
          reject(error)
        }
        resolve({ stdout, stderr })
      },
    )

    process.stdout.on('data', (data) => {
      log(data.toString())
    })

    process.stderr.on('data', (data) => {
      log(data.toString())
    })

    process.on('exit', (code) => {
      if (code) {
        log('child process exited with code ' + code.toString())
      }
    })
  })
}

export async function runNxCommandAsync(command: string, dir?: string) {
  const exec = PACKAGE_MANAGER === 'npm' ? 'npx' : 'pnpm exec'
  const cmd = `${exec} nx ${command} --verbose`
  const result = await customExec(cmd, dir)
  return result
}
