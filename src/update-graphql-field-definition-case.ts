/**
 * First remove deprecated fields from the schema, as there will likely be some
 * fields that were already renamed to `camelCase` and the `snake_case` was
 * deprecated.
 *
 * You will want to run the `remove-blank-lines-from-unstaged-changes` script after performing this codemod.
 *
 * jscodeshift --transform=../codemods/src/update-graphql-field-definition-case.ts --extensions=ts src/schema && ../codemods/scripts/remove-blank-lines-from-unstaged-changes && yarn prettier-project
 */

import {
  Transform,
  ArrowFunctionExpression,
  ObjectExpression,
  ObjectProperty,
  Identifier,
  ObjectPattern,
  BlockStatement,
  RestProperty,
  SpreadElement,
} from "jscodeshift"

import { errorLocation } from "./helpers/errorLocation"
import { getProperty } from "./helpers/getProperty"
import {
  forEachFieldConfigMapProperty,
  getFieldConfig,
  forEachFieldConfig,
} from "./helpers/graphqlSchemaDefinition"

const transform: Transform = (file, api, _options) => {
  const j = api.jscodeshift
  const collection = j(file.source)

  forEachFieldConfigMapProperty(collection, file, (fieldProp, fieldMap) => {
    const key = fieldProp.key as Identifier
    if (key.name === "__id") {
      console.log(`Skipping \`__id\` field (${errorLocation(file, fieldProp)})`)
    } else {
      const fieldConfig = getFieldConfig(fieldProp, file)
      /**
       * Rename the field itself
       */
      if (key.name.includes("_")) {
        const oldName = key.name
        const newName = camelize(oldName)
        if (getProperty(fieldMap, newName)) {
          console.log(
            `Skipping renaming \`${oldName}\` as another field by the ` +
              `name of \`${newName}\` already exists and is presumed ` +
              `to supersede it (${errorLocation(file, fieldProp)})`
          )
        } else {
          fieldProp.key = j.identifier(newName)
          if (fieldConfig) {
            const resolve = getProperty(fieldConfig, "resolve")
            if (!resolve) {
              const property = j.property.from({
                kind: "init",
                key: j.identifier(oldName),
                value: j.identifier(oldName),
                shorthand: true,
              })
              const resolveFunction = j.arrowFunctionExpression(
                [j.objectPattern([property])],
                j.identifier(oldName),
                true
              )
              fieldConfig.properties.push(
                j.objectProperty(j.identifier("resolve"), resolveFunction)
              )
            }
          }
        }
      }
    }
  })

  forEachFieldConfig(collection, file, fieldConfig => {
    /**
     * Rename arguments
     *
     * Turns out that we really have very few args, less that need
     * renaming, and of those only a few can "trivialliy" be done through a
     * codemod like the one below. So not going to spend more time on this.
     * They are called out as things that are skipped and need to be
     * manually fixed, that should be good enough.
     */
    const argsProp = getProperty(fieldConfig, "args")
    if (ObjectProperty.check(argsProp)) {
      const args = argsProp.value
      if (ObjectExpression.check(args)) {
        const renamedArgs: Record<string, string> = {}

        args.properties.forEach(argProp => {
          if (ObjectProperty.check(argProp)) {
            const argKey = argProp.key as Identifier
            const oldName = argKey.name
            if (oldName.includes("_")) {
              const newName = camelize(oldName)
              const existingNewName = getProperty(args, newName)
              if (existingNewName) {
                console.log(
                  `Skipping renaming \`${oldName}\` as another arg by the ` +
                    `name of \`${newName}\` already exists and is presumed ` +
                    `to supersede it (${errorLocation(file, existingNewName)})`
                )
              } else {
                argProp.key = j.identifier(newName)
                renamedArgs[oldName] = newName
              }
            }
          }
        })

        if (Object.keys(renamedArgs).length > 0) {
          const resolve = getProperty(fieldConfig, "resolve")!
          const resolveFunction = resolve.value
          if (ArrowFunctionExpression.check(resolveFunction)) {
            const argsParam = resolveFunction.params[1]
            if (argsParam) {
              if (ObjectPattern.check(argsParam)) {
                let restProperty: RestProperty | null = null
                argsParam.properties.forEach(paramProp => {
                  if (ObjectProperty.check(paramProp)) {
                    const oldName = (paramProp.key as Identifier).name
                    const newName = renamedArgs[oldName]
                    if (newName) {
                      /**
                       * Rename { oldName } or { oldName: oldName } to
                       * { newName: oldName } so that we don’t need to
                       * make any further changes to the body, which is
                       * safest.
                       */
                      if ((paramProp.value as Identifier).name === oldName) {
                        paramProp.shorthand = false
                        paramProp.key = j.identifier(newName)
                        paramProp.value = j.identifier(oldName)
                      } else {
                      /**
                       * In the case of { oldName: otherName } we rename to
                       * { newName: otherName }.
                       */
                        paramProp.key = j.identifier(newName)
                      }
                      /**
                       * Keep track of wether we've seen all renamed args so we
                       * can decide if we need to visit a rest property.
                       */
                      delete renamedArgs[oldName]
                    }
                  } else if (RestProperty.check(paramProp)) {
                    restProperty = paramProp
                  }
                })
                if (restProperty && Object.keys(renamedArgs).length > 0) {
                  throw new Error(
                    `Skipping rest property that holds renamed args (${errorLocation(
                      file,
                      restProperty
                    )})`
                  )
                }
              } else if (Identifier.check(argsParam)) {
                const paramProperties: Array<ObjectProperty | RestProperty> = []
                const newParamProperties: Array<
                  ObjectProperty | SpreadElement
                > = []
                /**
                 * Replace `(source, options, …) => { … }` with:
                 *
                 * ```
                 * (source, { newName: _oldName }, …) => {
                 *   const options = { oldName: _oldName }
                 *   …
                 * }
                 * ```
                 */
                Object.keys(renamedArgs).forEach(oldName => {
                  paramProperties.push(
                    j.objectProperty(
                      j.identifier(camelize(oldName)),
                      j.identifier(intermediateName(oldName))
                    )
                  )
                  newParamProperties.push(
                    j.objectProperty(
                      j.identifier(oldName),
                      j.identifier(intermediateName(oldName))
                    )
                  )
                })
                /**
                 * Or if not all args were renamed:
                 *
                 * ```
                 * (source, { newName: _oldName, ..._options }, …) => {
                 *   const options = { oldName: _oldName, ..._options }
                 *   …
                 * }
                 * ```
                 */
                if (Object.keys(renamedArgs).length < args.properties.length) {
                  paramProperties.push(
                    j.restProperty(
                      j.identifier(intermediateName(argsParam.name))
                    )
                  )
                  newParamProperties.push(
                    j.spreadElement(
                      j.identifier(intermediateName(argsParam.name))
                    )
                  )
                }
                resolveFunction.params[1] = j.objectPattern(paramProperties)
                /**
                 * Replace `(…) => { … }` with:
                 *
                 * ```
                 * (…) => {
                 *   const options = { oldName: _oldName }
                 *   …
                 * }
                 * ```
                 */
                const resolveBody = resolveFunction.body
                if (BlockStatement.check(resolveBody)) {
                  resolveBody.body.unshift(
                    j.variableDeclaration("const", [
                      j.variableDeclarator(
                        j.identifier(argsParam.name),
                        j.objectExpression(newParamProperties)
                      ),
                    ])
                  )
                } else {
                  console.log(
                    `Skipping args as resolve function returns object expression (${errorLocation(
                      file,
                      argsParam
                    )})`
                  )
                }
              } else {
                throw new Error(
                  `Unexpected param type \`${argsParam.type}\`` +
                    `(${errorLocation(file, argsParam)})`
                )
              }
            } else {
              throw new Error(
                `Arg is not captured as param in ` +
                  `resolve function (${errorLocation(file, resolveFunction)})`
              )
            }
          }
        }
      }
    }
  })

  return collection.toSource()
}

function intermediateName(name: string) {
  return `_${name}`
}

function camelize(input: string) {
  const components = input.split("_").map(c => {
    switch (c) {
      case "id":
        return "ID"
      case "url":
        return "URL"
      case "usd":
        return "USD"
      case "utc":
        return "UTC"
      case "md":
        return "MD"
      default:
        return c
    }
  })
  return [
    components[0],
    components
      .slice(1)
      .map(c => c[0].toUpperCase() + c.substring(1))
      .join(""),
  ].join("")
}

export const parser = "ts"
export default transform
