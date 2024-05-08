import { getProjects, readProjectConfiguration, Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { applicationGenerator } from './application'

describe('application generator', () => {
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

  it('should update project config', async () => {
    await applicationGenerator(tree, {
      name: 'myFirebaseApp',
    })
    const project = readProjectConfiguration(tree, 'my-firebase-app')
    expect(project.root).toEqual('apps/my-firebase-app')
    expect(project.targets).toEqual(
      expect.objectContaining({
        build: {
          executor: 'nx:run-commands',
          options: {
            command: `echo Build succeeded.`,
          },
        },
        watch: {
          executor: 'nx:run-commands',
          options: {
            command: `nx run-many --targets=build --projects=tag:firebase:dep:my-firebase-app --parallel=100 --watch`,
          },
        },
        lint: {
          executor: 'nx:run-commands',
          options: {
            command: `nx run-many --targets=lint --projects=tag:firebase:dep:my-firebase-app --parallel=100`,
          },
        },
        test: {
          executor: 'nx:run-commands',
          options: {
            command: `nx run-many --targets=test --projects=tag:firebase:dep:my-firebase-app --parallel=100`,
          },
        },
        firebase: {
          executor: 'nx:run-commands',
          options: {
            command: `firebase --config=firebase.json`,
          },
          configurations: {
            production: {
              command: `firebase --config=firebase.json`,
            },
          },
        },
        killports: {
          executor: 'nx:run-commands',
          options: {
            command: `kill-port --port 9099,5001,8080,9000,5000,8085,9199,9299,4000,4400,4500`,
          },
        },
        getconfig: {
          executor: 'nx:run-commands',
          options: {
            command: `nx run my-firebase-app:firebase functions:config:get > apps/my-firebase-app/environment/.runtimeconfig.json`,
          },
        },
        emulate: {
          executor: 'nx:run-commands',
          options: {
            commands: [
              `nx run my-firebase-app:killports`,
              `nx run my-firebase-app:firebase emulators:start --import=apps/my-firebase-app/.emulators --export-on-exit --inspect-functions`,
            ],
            parallel: false,
          },
        },
        serve: {
          executor: '@simondotm/nx-firebase:serve',
          options: {
            commands: [
              `nx run my-firebase-app:watch`,
              `nx run my-firebase-app:emulate`,
            ],
          },
        },
        deploy: {
          executor: 'nx:run-commands',
          dependsOn: ['build'],
          options: {
            command: `nx run my-firebase-app:firebase deploy`,
          },
        },
      }),
    )
  })

  it('should update tags', async () => {
    await applicationGenerator(tree, {
      name: 'myFirebaseApp',
      tags: 'one,two',
    })
    const projects = Object.fromEntries(getProjects(tree))
    expect(projects).toMatchObject({
      'my-firebase-app': {
        tags: ['firebase:app', 'firebase:name:my-firebase-app', 'one', 'two'],
      },
    })
  })

  it('should generate files', async () => {
    await applicationGenerator(tree, {
      name: 'myFirebaseApp',
    })
    const root = 'apps/my-firebase-app'
    // default firebase project files
    expect(tree.exists(`${root}/public/index.html`)).toBeTruthy()
    expect(tree.exists(`${root}/readme.md`)).toBeTruthy()
    // rules & indexes
    expect(tree.exists(`${root}/database.rules.json`)).toBeTruthy()
    expect(tree.exists(`${root}/firestore.indexes.json`)).toBeTruthy()
    expect(tree.exists(`${root}/firestore.rules`)).toBeTruthy()
    expect(tree.exists(`${root}/storage.rules`)).toBeTruthy()
    // workspace firebase configs
    expect(tree.isFile(`package.json`)).toBeTruthy()
    expect(tree.isFile(`firebase.json`)).toBeTruthy()
    expect(tree.isFile(`.firebaserc`)).toBeTruthy()
    // environment files
    expect(tree.isFile(`${root}/environment/.secret.local`)).toBeTruthy()
    expect(tree.isFile(`${root}/environment/.env`)).toBeTruthy()
    expect(tree.isFile(`${root}/environment/.env.local`)).toBeTruthy()
  })

  it('should generate multiple firebase configurations', async () => {
    await applicationGenerator(tree, { name: 'myFirebaseApp1' })
    await applicationGenerator(tree, { name: 'myFirebaseApp2' })
    expect(tree.isFile(`firebase.json`)).toBeTruthy()
    expect(tree.isFile(`firebase.my-firebase-app2.json`)).toBeTruthy()
  })

  it('should generate app in subdirectory', async () => {
    await applicationGenerator(tree, {
      name: 'myFirebaseApp',
      directory: 'subDir',
    })

    // default firebase project files
    const root = `apps/sub-dir/my-firebase-app`
    expect(tree.exists(`${root}/public/index.html`)).toBeTruthy()
    expect(tree.exists(`${root}/readme.md`)).toBeTruthy()
    // rules & indexes
    expect(tree.exists(`${root}/database.rules.json`)).toBeTruthy()
    expect(tree.exists(`${root}/firestore.indexes.json`)).toBeTruthy()
    expect(tree.exists(`${root}/firestore.rules`)).toBeTruthy()
    expect(tree.exists(`${root}/storage.rules`)).toBeTruthy()
  })

  // TODO:
  // check --firebaseProject
  // check --firebaseConfig
  // check multiple apps
  //

  // describe('--skipFormat', () => {
  //   it('should format files', async () => {
  //     jest.spyOn(devkit, 'formatFiles')

  //     await applicationGenerator(tree, { name: appName })

  //     expect(devkit.formatFiles).toHaveBeenCalled()
  //   })

  //   // it('should not format files when --skipFormat=true', async () => {
  //   //   jest.spyOn(devkit, 'formatFiles')

  //   //   await applicationGenerator(tree, { name: appName, skipFormat: true })

  //   //   expect(devkit.formatFiles).not.toHaveBeenCalled()
  //   // })
  // })

  // This is an app generator test
  // it('should generate multiple firebase configurations', async () => {
  //   await functionGenerator(tree, {
  //     name: 'myFirebaseFunction1',
  //     firebaseApp: 'my-firebase-app',
  //   })
  //   await functionGenerator(tree, {
  //     name: 'myFirebaseFunction2',
  //     firebaseApp: 'my-firebase-app',
  //   })

  //   console.log(tree)

  //   expect(tree.isFile(`firebase.json`)).toBeTruthy()
  //   expect(tree.isFile(`firebase.my-firebase-app.json`)).toBeTruthy()
  // })
})
