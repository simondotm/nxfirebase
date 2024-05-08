import {
  Tree,
  readProjectConfiguration,
  updateProjectConfiguration,
} from '@nx/devkit'
import type { NormalizedSchema } from '../schema'
import type { FunctionAssetsEntry, FunctionAssetsGlob } from '../../../types'

export function updateProject(host: Tree, options: NormalizedSchema): void {
  const project = readProjectConfiguration(host, options.projectName)

  const firebaseAppProject = options.firebaseAppProject

  // replace the default node build target with a simplified version
  // we dont need dev/production build configurations for firebase functions since its a confined secure environment
  project.targets.build = {
    executor: '@nx/esbuild:esbuild',
    outputs: ['{options.outputPath}'],
    options: {
      outputPath: project.targets.build.options.outputPath,
      main: project.targets.build.options.main,
      tsConfig: project.targets.build.options.tsConfig,
      assets: project.targets.build.options.assets,
      generatePackageJson: true,
      // these are the defaults for esbuild, but let's set them anyway
      platform: 'node',
      bundle: true,
      thirdParty: false,
      dependenciesFieldType: 'dependencies',
      target: 'node16',
      format: [options.format || 'esm'], // default for esbuild is esm
      esbuildOptions: {
        sourcemap: true,
        logLevel: 'info',
      },
    },
  }

  // add reference to firebase app environment assets
  const firebaseAppRoot = firebaseAppProject.root
  const assets: FunctionAssetsEntry[] = project.targets.build.options.assets
  const glob: FunctionAssetsGlob = {
    glob: '**/*',
    input: `${firebaseAppRoot}/environment`,
    output: '.',
  }
  assets.push(glob)

  // add deploy target
  project.targets.deploy = {
    executor: 'nx:run-commands',
    options: {
      // command: `firebase deploy${firebaseProject} --config=${firebaseConfig}`,
      // use the firebase app to deploy, this way the function does not need to know the project or config
      command: `nx run ${firebaseAppProject.name}:deploy --only functions:${options.projectName}`,
    },
    dependsOn: ['build'],
  }

  // Remove default node app serve target
  // No serve target for functions, since we may have multiple functions in a firebase project
  // Instead we serve at the firebase app project
  delete project.targets.serve

  updateProjectConfiguration(host, options.projectName, project)

  // Add function project as implicit dep of firebase app project
  firebaseAppProject.implicitDependencies ||= []
  firebaseAppProject.implicitDependencies.push(options.projectName)
  firebaseAppProject.implicitDependencies.sort()
  updateProjectConfiguration(host, options.app, firebaseAppProject)
}
