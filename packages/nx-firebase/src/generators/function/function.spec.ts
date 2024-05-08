import {
  getProjects,
  joinPathFragments,
  readJson,
  readProjectConfiguration,
  Tree,
  writeJson,
} from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { functionGenerator } from './function'
import applicationGenerator from '../application/application'

describe('function generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({
      layout: 'apps-libs',
    })
    jest.clearAllMocks()
  })

  it('should generate workspace', () => {
    expect(tree.exists(`firebase.json`)).toBeFalsy()
    expect(tree.exists(`.firebaserc`)).toBeFalsy()
    expect(tree.isFile(`package.json`)).toBeTruthy()
  })

  it('should require a valid firebase app project', async () => {
    // generator should throw if there is no valid firebase app project in the workspace
    await expect(
      functionGenerator(tree, {
        name: 'myFirebaseFunction',
        app: 'myFirebaseApp',
      }),
    ).rejects.toThrow(
      "A firebase application project called 'my-firebase-app' was not found in this workspace.",
    )
  })

  describe('function generator', () => {
    beforeEach(async () => {
      await applicationGenerator(tree, {
        name: 'myFirebaseApp',
      })
    })

    describe('application setup', () => {
      it('should create a firebase config with no functions', () => {
        const firebaseConfig = readJson(tree, 'firebase.json')
        expect(firebaseConfig.functions.length).toEqual(0)
      })
    })

    describe('function creation', () => {
      it('should generate the correct Nx project config', async () => {
        await functionGenerator(tree, {
          name: 'myFirebaseFunction',
          app: 'my-firebase-app',
        })
        const project = readProjectConfiguration(tree, 'my-firebase-function')
        expect(project.root).toEqual('apps/my-firebase-function')
        expect(project.targets).toEqual(
          expect.objectContaining({
            build: {
              executor: '@nx/esbuild:esbuild',
              outputs: ['{options.outputPath}'],
              options: {
                outputPath: 'dist/apps/my-firebase-function',
                main: 'apps/my-firebase-function/src/main.ts',
                tsConfig: 'apps/my-firebase-function/tsconfig.app.json',
                assets: [
                  'apps/my-firebase-function/src/assets',
                  {
                    glob: '**/*',
                    input: 'apps/my-firebase-app/environment',
                    output: '.',
                  },
                ],
                generatePackageJson: true,
                platform: 'node',
                bundle: true,
                thirdParty: false,
                dependenciesFieldType: 'dependencies',
                target: 'node16',
                format: ['esm'],
                esbuildOptions: {
                  sourcemap: true,
                  logLevel: 'info',
                },
              },
            },
            deploy: {
              executor: 'nx:run-commands',
              options: {
                // command: `firebase deploy --config=firebase.json`,
                command: `nx run my-firebase-app:deploy --only functions:my-firebase-function`,
              },
              dependsOn: ['build'],
            },
            lint: {
              executor: '@nx/linter:eslint',
              outputs: ['{options.outputFile}'],
              options: {
                lintFilePatterns: ['apps/my-firebase-function/**/*.ts'],
              },
            },
            test: {
              executor: '@nx/jest:jest',
              outputs: ['{workspaceRoot}/coverage/{projectRoot}'],
              options: {
                jestConfig: 'apps/my-firebase-function/jest.config.ts',
                passWithNoTests: true,
              },
              configurations: {
                ci: {
                  ci: true,
                  codeCoverage: true,
                },
              },
            },
          }),
        )
        expect(project.targets.serve).toBeUndefined()
      })

      it('should update tags', async () => {
        await functionGenerator(tree, {
          name: 'myFirebaseFunction',
          app: 'myFirebaseApp',
          tags: 'one,two',
        })
        const projects = Object.fromEntries(getProjects(tree))
        expect(projects).toMatchObject({
          'my-firebase-function': {
            tags: [
              'firebase:function',
              'firebase:name:my-firebase-function',
              'firebase:dep:my-firebase-app',
              'one',
              'two',
            ],
          },
        })
      })

      it('should generate files', async () => {
        await functionGenerator(tree, {
          name: 'myFirebaseFunction',
          app: 'myFirebaseApp',
        })
        const root = 'apps/my-firebase-function'
        expect(tree.exists(`${root}/src/main.ts`)).toBeTruthy()
        expect(tree.exists(`${root}/src/assets/.gitkeep`)).toBeTruthy()
        expect(tree.exists(`${root}/package.json`)).toBeTruthy()
        expect(tree.exists(`${root}/readme.md`)).toBeTruthy()
        expect(tree.exists(`${root}/jest.config.ts`)).toBeTruthy()
        expect(tree.exists(`${root}/.eslintrc.json`)).toBeTruthy()
        expect(tree.exists(`${root}/project.json`)).toBeTruthy()
        expect(tree.exists(`${root}/tsconfig.app.json`)).toBeTruthy()
        expect(tree.exists(`${root}/tsconfig.json`)).toBeTruthy()
        expect(tree.exists(`${root}/tsconfig.spec.json`)).toBeTruthy()
        // do not want, from node generator
        expect(tree.exists(`${root}/webpack.config.js`)).toBeFalsy()
        expect(tree.exists(`${root}/src/test-setup.ts`)).toBeFalsy()
      })

      it('should generate function in subdirectory', async () => {
        await functionGenerator(tree, {
          name: 'myFirebaseFunction',
          app: 'my-firebase-app',
          directory: 'subDir',
        })

        const projects = Object.fromEntries(getProjects(tree))
        expect(projects).toMatchObject({
          'sub-dir-my-firebase-function': {
            tags: [
              'firebase:function',
              'firebase:name:sub-dir-my-firebase-function',
              'firebase:dep:my-firebase-app',
            ],
          },
        })

        const root = 'apps/sub-dir/my-firebase-function'
        expect(tree.exists(`${root}/src/main.ts`)).toBeTruthy()
        expect(tree.exists(`${root}/src/assets/.gitkeep`)).toBeTruthy()
        expect(tree.exists(`${root}/package.json`)).toBeTruthy()
        expect(tree.exists(`${root}/readme.md`)).toBeTruthy()
        expect(tree.exists(`${root}/jest.config.ts`)).toBeTruthy()
        expect(tree.exists(`${root}/.eslintrc.json`)).toBeTruthy()
        expect(tree.exists(`${root}/project.json`)).toBeTruthy()
        expect(tree.exists(`${root}/tsconfig.app.json`)).toBeTruthy()
        expect(tree.exists(`${root}/tsconfig.json`)).toBeTruthy()
        expect(tree.exists(`${root}/tsconfig.spec.json`)).toBeTruthy()
        // do not want, from node generator
        expect(tree.exists(`${root}/webpack.config.js`)).toBeFalsy()
        expect(tree.exists(`${root}/src/test-setup.ts`)).toBeFalsy()
      })
    })

    describe('firebase.json functions config', () => {
      it('should add the function to the firebase config', async () => {
        await functionGenerator(tree, {
          name: 'myFirebaseFunction',
          app: 'myFirebaseApp',
        })
        const firebaseConfig = readJson(tree, 'firebase.json')
        // console.log(firebaseConfig)
        expect(firebaseConfig.functions.length).toEqual(1)
        expect(firebaseConfig.functions[0]).toEqual({
          codebase: 'my-firebase-function',
          source: 'dist/apps/my-firebase-function',
          runtime: `nodejs16`,
          ignore: ['*.local'],
        })
      })

      it('should handle functions being empty object', async () => {
        const firebaseConfigInitial = readJson(tree, 'firebase.json')
        firebaseConfigInitial.functions = {}
        writeJson(tree, 'firebase.json', firebaseConfigInitial)

        await functionGenerator(tree, {
          name: 'myFirebaseFunction',
          app: 'myFirebaseApp',
        })

        const firebaseConfig = readJson(tree, 'firebase.json')
        // console.log(firebaseConfig)
        expect(firebaseConfig.functions.length).toEqual(1)
        expect(firebaseConfig.functions[0]).toEqual({
          codebase: 'my-firebase-function',
          source: 'dist/apps/my-firebase-function',
          runtime: `nodejs16`,
          ignore: ['*.local'],
        })
      })

      it('should handle functions being already present', async () => {
        const firebaseConfigInitial = readJson(tree, 'firebase.json')
        // console.log('1')
        // console.log(firebaseConfigInitial)
        const testFunction = {
          codebase: 'test',
          source: 'dist/apps/test',
          runtime: `nodejs16`,
          ignore: ['*.local'],
        }
        firebaseConfigInitial.functions = [testFunction]
        writeJson(tree, 'firebase.json', firebaseConfigInitial)
        // console.log('2')
        // console.log(firebaseConfigInitial)

        await functionGenerator(tree, {
          name: 'myFirebaseFunction',
          app: 'myFirebaseApp',
        })

        const firebaseConfig = readJson(tree, 'firebase.json')
        // console.log('3')
        // console.log(firebaseConfig)

        // expect(firebaseConfig.functions.length).toEqual(2)
        expect(firebaseConfig.functions).toContainEqual(testFunction)
        expect(firebaseConfig.functions).toContainEqual({
          codebase: 'my-firebase-function',
          source: 'dist/apps/my-firebase-function',
          runtime: `nodejs16`,
          ignore: ['*.local'],
        })
      })
    })

    // Not needed since we use the app deploy for functions
    // describe('function firebase deploy --config', () => {
    //   it('should generate functions that deploy with correct firebase config', async () => {
    //     await functionGenerator(tree, {
    //       name: 'myFirebaseFunction',
    //       firebaseApp: 'my-firebase-app',
    //     })
    //     const project = readProjectConfiguration(tree, 'my-firebase-function')
    //     expect(project.targets.deploy.options.command).toContain(
    //       '--config=firebase.json',
    //     )
    //   })

    //   it('should generate function with correct firebase config when there are multiple firebase apps', async () => {
    //     // generate 2nd app, will create a custom firebase.<project>.json
    //     await applicationGenerator(tree, {
    //       name: 'myFirebaseApp2',
    //     })
    //     // attach this function to 2nd app
    //     await functionGenerator(tree, {
    //       name: 'myFirebaseFunction2',
    //       firebaseApp: 'my-firebase-app2',
    //     })
    //     // function should detect & use the custom firebase config
    //     const project = readProjectConfiguration(tree, 'my-firebase-function2')
    //     expect(project.targets.deploy.options.command).toContain(
    //       '--config=firebase.my-firebase-app2.json',
    //     )
    //   })
    // })

    describe('function options', () => {
      // describe('function option --project', () => {
      //   it('should generate function that deploy with the correct firebase project', async () => {
      //     await functionGenerator(tree, {
      //       name: 'myFirebaseFunction',
      //       firebaseApp: 'my-firebase-app',
      //       firebaseProject: 'projectId',
      //     })
      //     const project = readProjectConfiguration(tree, 'my-firebase-function')
      //     expect(project.targets.deploy.options.command).toContain(
      //       '--project=projectId',
      //     )
      //   })
      // })

      describe('function option --format', () => {
        it('should generate function configured for --format=esm', async () => {
          await functionGenerator(tree, {
            name: 'myFirebaseFunction',
            app: 'my-firebase-app',
            format: 'esm',
          })
          const project = readProjectConfiguration(tree, 'my-firebase-function')
          expect(project.targets.build.options.format).toEqual(['esm'])

          // check the package has the correct module type
          const packageJson = readJson(
            tree,
            joinPathFragments(project.root, 'package.json'),
          )
          expect(packageJson.type).toEqual('module')

          // check the tsconfig
          const tsConfig = readJson(
            tree,
            joinPathFragments(project.root, 'tsconfig.app.json'),
          )
          expect(tsConfig.compilerOptions.module).toEqual('es2020')
        })

        it('should generate function configured for --format=commonjs output', async () => {
          await functionGenerator(tree, {
            name: 'myFirebaseFunction',
            app: 'my-firebase-app',
            format: 'cjs',
          })
          const project = readProjectConfiguration(tree, 'my-firebase-function')
          expect(project.targets.build.options.format).toEqual(['cjs'])

          // check the package has the correct module type
          const packageJson = readJson(
            tree,
            joinPathFragments(project.root, 'package.json'),
          )
          expect(packageJson.type).toEqual('commonjs')

          // check the tsconfig
          const tsConfig = readJson(
            tree,
            joinPathFragments(project.root, 'tsconfig.app.json'),
          )
          expect(tsConfig.compilerOptions.module).toEqual('commonjs')
        })
      })
      describe('function option --runTime', () => {
        it('should generate function with correct node runtime', async () => {
          await functionGenerator(tree, {
            name: 'myFirebaseFunction',
            app: 'my-firebase-app',
            runTime: '18',
          })
          const project = readProjectConfiguration(tree, 'my-firebase-function')

          // check the package has the correct module type
          const packageJson = readJson(
            tree,
            joinPathFragments(project.root, 'package.json'),
          )
          expect(packageJson.engines.node).toEqual('18')

          // check the function firebase config
          const firebaseConfig = readJson(tree, 'firebase.json')
          // console.log(firebaseConfig)
          expect(firebaseConfig.functions[0].runtime).toEqual('nodejs18')
        })
      })
    })
  })
  // check implicitDependencies
})
