import {
  detectPackageManager,
  offsetFromRoot,
  Tree,
  updateJson,
  generateFiles,
  joinPathFragments,
} from '@nx/devkit'
import type { NormalizedSchema } from '../schema'
import { packageVersions } from '../../../__generated__/nx-firebase-versions'

/**
 * Generate the firebase app specific files
 *
 * @param host
 * @param options
 */
export function createFiles(host: Tree, options: NormalizedSchema): void {
  const firebaseAppConfig = options.firebaseConfigName
  const firebaseAppConfigPath = joinPathFragments(
    offsetFromRoot(options.projectRoot),
    firebaseAppConfig,
  )

  const substitutions = {
    tmpl: '',
    projectName: options.projectName,
    projectRoot: options.projectRoot,

    firebaseAppName: options.app,
    firebaseAppConfig,
    firebaseAppConfigPath,

    firebaseNodeEngine: options.runTime,

    // firebaseNodeRuntime,
    // firebaseNodeEngine,

    moduleType: options.format === 'esm' ? 'module' : 'commonjs',
  }

  // The default functions package.json & templated typescript source files are added here
  // to match the `firebase init` cli setup
  // if the user isn't using functions, they can just delete and update their firebase config accordingly
  //
  // Rules and index files also get generated in the application folder;
  // 1. so that they dont clutter up the root workspace
  // 2. so that they are located within the nx firebase application project they relate to
  generateFiles(
    host,
    joinPathFragments(__dirname, '..', 'files'),
    options.projectRoot,
    substitutions,
  )

  // set dependencies for the firebase function
  const firebasePackageDependencies = {}
  if (detectPackageManager() === 'pnpm') {
    firebasePackageDependencies[
      '@google-cloud/functions-framework'
    ] = `^${packageVersions.googleCloudFunctionsFramework}`
  }

  if (Object.keys(firebasePackageDependencies).length > 0) {
    updateJson(
      host,
      joinPathFragments(options.projectRoot, 'package.json'),
      (json) => {
        json.dependencies = firebasePackageDependencies
        return json
      },
    )
  }
}
