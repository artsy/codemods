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
  forEachArgumentMap,
  getArgumentMap,
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

  /**
   * First rename use of args in resolve function, because we'd lose the
   * original name if we'd first rename the actual arg definition.
   */
  forEachFieldConfig(collection, file, fieldConfig => {
    const argsProp = getProperty(fieldConfig, "args")
    if (ObjectProperty.check(argsProp)) {
      const argumentMap = getArgumentMap(argsProp, file)
      if (argumentMap) {
        const argsThatNeedRenaming = propertiesWithSnakeCase(argumentMap)
        if (argsThatNeedRenaming.length > 0) {
          const resolve = getProperty(fieldConfig, "resolve")!
          const resolveFunction = resolve.value
          if (ArrowFunctionExpression.check(resolveFunction)) {
            const argsParam = resolveFunction.params[1]
            if (argsParam) {
              if (ObjectPattern.check(argsParam)) {
                propertiesWithSnakeCase(argsParam).forEach(paramProp => {
                  const oldName = (paramProp.key as Identifier).name
                  const newName = camelize(oldName)
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
                })
              } else if (Identifier.check(argsParam)) {
                const paramProperties: Array<ObjectProperty | RestProperty> = []
                const newParamProperties: Array<
                  ObjectProperty | SpreadElement
                > = []
                /**
                 * Replace `(source, options, …) => { … }` with:
                 *
                 * ```
                 * (source, { newName }, …) => {
                 *   const options = { oldName: newName }
                 *   …
                 * }
                 * ```
                 */
                argsThatNeedRenaming.forEach(argProp => {
                  const oldName = (argProp.key as Identifier).name
                  const newName = camelize(oldName)
                  paramProperties.push(
                    j.objectProperty.from({
                      shorthand: true,
                      key: j.identifier(newName),
                      value: j.identifier(newName),
                    })
                  )
                  newParamProperties.push(
                    j.objectProperty(
                      j.identifier(oldName),
                      j.identifier(newName)
                    )
                  )
                })
                /**
                 * Or if not all args were renamed:
                 *
                 * ```
                 * (source, { newName, ..._options }, …) => {
                 *   const options = { oldName: newName, ..._options }
                 *   …
                 * }
                 * ```
                 */
                if (
                  argsThatNeedRenaming.length < argumentMap.properties.length
                ) {
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
                 *   const options = { oldName: newName }
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

  /**
   * Then rename actual arg definition.
   */
  forEachArgumentMap(collection, file, argumentMap => {
    propertiesWithSnakeCase(argumentMap).forEach(argProp => {
      const oldName = (argProp.key as Identifier).name
      const newName = camelize(oldName)
      const existingNewName = getProperty(argumentMap, newName)
      if (existingNewName) {
        console.log(
          `Skipping renaming \`${oldName}\` as another arg by the ` +
            `name of \`${newName}\` already exists and is presumed ` +
            `to supersede it (${errorLocation(file, existingNewName)})`
        )
      } else {
        argProp.key = j.identifier(newName)
      }
    })
  })

  return collection.toSource()
}

function intermediateName(name: string) {
  return `_${name}`
}

function propertiesWithSnakeCase(object: ObjectExpression | ObjectPattern) {
  return (object.properties as any[]).filter(prop => {
    if (ObjectProperty.check(prop)) {
      return (prop.key as Identifier).name.includes("_")
    }
    return false
  }) as ObjectProperty[]
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
      case "jwt":
        return "JWT"
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
