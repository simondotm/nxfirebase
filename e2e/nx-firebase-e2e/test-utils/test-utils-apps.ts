import type { ProjectData } from './test-utils-project-data'
import { readJson } from '@nx/plugin/testing'

export function expectedAppProjectTargets(appProject: ProjectData) {
  return {
    build: {
      executor: 'nx:run-commands',
      options: {
        command: `echo Build succeeded.`,
      },
    },
    watch: {
      executor: 'nx:run-commands',
      options: {
        command: `nx run-many --targets=build --projects=tag:firebase:dep:${appProject.projectName} --parallel=100 --watch`,
      },
    },
    lint: {
      executor: 'nx:run-commands',
      options: {
        command: `nx run-many --targets=lint --projects=tag:firebase:dep:${appProject.projectName} --parallel=100`,
      },
    },
    test: {
      executor: 'nx:run-commands',
      options: {
        command: `nx run-many --targets=test --projects=tag:firebase:dep:${appProject.projectName} --parallel=100`,
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
        command: `nx run ${appProject.projectName}:firebase functions:config:get > ${appProject.projectDir}/environment/.runtimeconfig.json`,
      },
    },
    emulate: {
      executor: 'nx:run-commands',
      options: {
        commands: [
          `nx run ${appProject.projectName}:killports`,
          `nx run ${appProject.projectName}:firebase emulators:start --import=${appProject.projectDir}/.emulators --export-on-exit --inspect-functions`,
        ],
        parallel: false,
      },
    },
    serve: {
      executor: '@simondotm/nx-firebase:serve',
      options: {
        commands: [
          `nx run ${appProject.projectName}:watch`,
          `nx run ${appProject.projectName}:emulate`,
        ],
      },
    },
    deploy: {
      executor: 'nx:run-commands',
      dependsOn: ['build'],
      options: {
        command: `nx run ${appProject.projectName}:firebase deploy`,
      },
    },
  }
}

export function validateProjectConfig(appProject: ProjectData) {
  const project = readJson(`${appProject.projectDir}/project.json`)
  // expect(project.root).toEqual(`apps/${projectName}`)
  expect(project.targets).toEqual(
    expect.objectContaining(expectedAppProjectTargets(appProject)),
  )
}
