# Nx-Firebase schemas (plugin v2)

- [Nx-Firebase schemas (plugin v2)](#nx-firebase-schemas-plugin-v2)
  - [Overview](#overview)
  - [Firebase Application Projects](#firebase-application-projects)
  - [Firebase Function Projects](#firebase-function-projects)
  - [Firebase Function Configs](#firebase-function-configs)

## Overview

Whilst Nx Firebase plugin provides convenient generators for firebase apps and functions, it is perfectly possible to manually create nx projects yourself with the same functionality.

The `project.json` and `firebase.json` config schemas are below.

## Firebase Application Projects

Firebase Application projects are a useful way to group firebase resources and provide common functionality such as deploy, or build.

We add all function app projects as implicit dependencies, so that building the app project will automatically build function dependents.

We tag all dependent projects so that we can use Nx `run-many` with tag specifiers for buid actions like `watch`, `test` and `lint`.

```
{
  "name": "your-firebase-app-project-name",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/your-firebase-app-project-name",
  "projectType": "application",
  "implicitDependencies": [
    "your-firebase-function-project-name",
  ],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "echo Build succeeded."
      }
    },
    "watch": {
      "executor": "nx:run-commands",
      "options": {
        "command": "nx run-many --targets=build --projects=tag:firebase:dep:your-firebase-app-project-name --parallel=100 --watch"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "nx run-many --targets=lint --projects=tag:firebase:dep:your-firebase-app-project-name --parallel=100"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "nx run-many --targets=test --projects=tag:firebase:dep:your-firebase-app-project-name --parallel=100"
      }
    },
    "firebase": {
      "executor": "nx:run-commands",
      "options": {
        "command": "firebase --config=<your-firebase-project-config> --project=<your-firebase-projectid>"
      },
      "configurations": {
        "production": {
          "command": "firebase --config=<your-firebase-project-config> --project=<your-firebase-production-projectid>"
        }
      }
    },
    "killports": {
      "executor": "nx:run-commands",
      "options": {
        "command": "kill-port --port 9099,5001,8080,9000,5000,8085,9199,9299,4000,4400,4500"
      }
    },
    "getconfig": {
      "executor": "nx:run-commands",
      "options": {
        "command": "nx run your-firebase-app-project-name:firebase functions:config:get > apps/your-firebase-app-project-name/environment/.runtimeconfig.json"
      }
    },
    "emulate": {
      "executor": "nx:run-commands",
      "options": {
        "commands": [
          "nx run your-firebase-app-project-name:killports",
          "nx run your-firebase-app-project-name:firebase emulators:start --import=apps/your-firebase-app-project-name/.emulators --export-on-exit --inspect-functions"
        ],
        "parallel": false
      }
    },
    "serve": {
      "executor": "@simondotm/nx-firebase:serve",
      "options": {
        "commands": [
          "nx run your-firebase-app-project-name:watch",
          "nx run your-firebase-app-project-name:emulate"
        ]
      }
    },
    "deploy": {
      "executor": "nx:run-commands",
      "dependsOn": [
        "build"
      ],
      "options": {
        "command": "nx run your-firebase-app-project-name:firebase deploy"
      }
    }
  },
  "tags": [
    "firebase:app",
    "firebase:name:your-firebase-app-project-name"
  ]
}
```

## Firebase Function Projects

Function projects can export as many firebase functions as you like.

Functions use `esbuild` to compile & bundle the code.

```
{
  "name": "your-firebase-function-project-name",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/your-firebase-function-project-name/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/esbuild:esbuild",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/your-firebase-function-project-name",
        "main": "apps/your-firebase-function-project-name/src/main.ts",
        "tsConfig": "apps/your-firebase-function-project-name/tsconfig.app.json",
        "assets": [
          "apps/your-firebase-function-project-name/src/assets",
          { "glob": "**/*", "input": "apps/your-firebase-app-project-name/environment", "output": "."},
        ],
        "generatePackageJson": true,
        "platform": "node",
        "bundle": true,
        "thirdParty": false,
        "dependenciesFieldType": "dependencies",
        "target": "node16",
        "format": ["esm"],
        "esbuildOptions": {
          "sourcemap": true,
          "logLevel": "info"
        }
      }
    },
    "lint": {
      "executor": "@nx/linter:eslint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["apps/your-firebase-function-project-name/**/*.ts"]
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "apps/your-firebase-function-project-name/jest.config.ts",
        "passWithNoTests": true
      },
      "configurations": {
        "ci": {
          "ci": true,
          "codeCoverage": true
        }
      }
    },
    "deploy": {
      "executor": "nx:run-commands",
      "options": {
        "command": "nx run your-firebase-app-project-name:deploy --only functions:your-firebase-function-project-name"
      },
      "dependsOn": ["build"]
    }
  },
  "tags": [
    "firebase:function",
    "firebase:name:your-firebase-function-project-name",
    "firebase:dep:your-firebase-app-project-name"
  ]
}

```

## Firebase Function Configs

We make use of the [codebase](https://firebase.google.com/docs/functions/organize-functions?gen=2nd#organize_functions_in_codebases) feature to identify each firebase function project using the exact same name as the Nx project name for the function.

For each function project, `firebase.json` will need the following entries in the `functions` config array.

```
functions: [
    {
      "codebase": "your-function-project-name",
      "source": "dist/apps/your-function-project-name",
      "runtime": "nodejs16",
      "ignore": [ "*.local" ]
    }
]

```
