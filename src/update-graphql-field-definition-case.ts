/**
 * 1. Remove deprecated fields with other codemod.
 *
 * 2. Run this codemod, and you likely want to filter out these warnings:
 *
 *    ```bash
 *    $ jscodeshift --extensions=ts --ignore-pattern='src/schema/v2/v2/*' \
 *                  --transform=../codemods/src/update-graphql-field-definition-case.ts \
 *                  src/schema/v2 \
 *      | grep -v -E 'spread of.+Field|field config by variable reference|function call `(markdown|initials|amount|filterArtworks|numeral|money)' \
 *      | sort \
 *      | uniq
 *    ```
 *
 * 3. Run the `remove-blank-lines-from-unstaged-changes` script.
 *
 * 4. Run prettier: `yarn prettier-project`
 *
 * 5. Run the type-checker and fix any issues: `yarn type-check -w`
 *
 * 6. Dump the schema and look for left-over `snake_case`: `yarn dump:local`
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
  FileInfo,
  JSCodeshift,
} from "jscodeshift"
import recast from "recast"

import { errorLocation } from "./helpers/errorLocation"
import { getProperty } from "./helpers/getProperty"
import {
  forEachOutputFieldConfigMapProperty,
  getFieldConfig,
  forEachOutputFieldConfig,
  forEachArgumentMap,
  getArgumentMap,
  forEachInputFieldConfigMapProperty,
  forEachMutationConfig,
  forEachInputFieldConfigMap,
} from "./helpers/graphqlSchemaDefinition"
import { ExpressionKind, PatternKind } from "ast-types/gen/kinds"
import { camelize } from "./helpers/camelize"

const transform: Transform = (file, api, _options) => {
  const j = api.jscodeshift
  const collection = j(file.source)

  /*****************************************************************************
   * Output fields
   ****************************************************************************/

  forEachOutputFieldConfigMapProperty(
    collection,
    file,
    (fieldProp, fieldMap) => {
      const key = fieldProp.key as Identifier
      if (key.name === "__id") {
        console.log(
          `Skipping \`__id\` field (${errorLocation(file, fieldProp)})`
        )
      } else {
        /**
         * Rename the field itself and add a resolver
         */
        if (renameFieldKey(fieldProp, fieldMap, file, j)) {
          const fieldConfig = getFieldConfig(fieldProp, file)
          if (fieldConfig) {
            const resolve = getProperty(fieldConfig, "resolve")
            if (!resolve) {
              const oldName = key.name
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
  )

  /**
   * First rename use of args in resolve function, because we'd lose the
   * original name if we'd first rename the actual arg definition.
   */
  forEachOutputFieldConfig(collection, file, fieldConfig => {
    const argsProp = getProperty(fieldConfig, "args")
    if (ObjectProperty.check(argsProp)) {
      const argumentMap = getArgumentMap(argsProp, file)
      if (argumentMap) {
        const argsThatNeedRenaming = propertiesWithSnakeCase(argumentMap)
        if (argsThatNeedRenaming.length > 0) {
          const resolveFunction = getProperty(fieldConfig, "resolve")!.value
          renameFunctionParams(argumentMap, resolveFunction, 1, file, j)
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

  /*****************************************************************************
   * Input fields
   ****************************************************************************/

  /**
   * First rename use of inputs in mutate function, because we'd lose the
   * original name if we'd first rename the actual input definition.
   */
  forEachMutationConfig(collection, file, mutationConfig => {
    const inputFieldsMap = getProperty(mutationConfig, "inputFields")!.value
    if (ObjectExpression.check(inputFieldsMap)) {
      const mutateFunction = getProperty(mutationConfig, "mutateAndGetPayload")!
        .value
      renameFunctionParams(inputFieldsMap, mutateFunction, 0, file, j)
    }
  })

  forEachInputFieldConfigMap(collection, file, fieldMap => {
    const argsThatNeedRenaming = propertiesWithSnakeCase(fieldMap)
    if (argsThatNeedRenaming.length > 0) {
      const newFields = j.objectExpression([])
      const oldFields = j.objectExpression([])
      argsThatNeedRenaming.forEach(prop => {
        if (ObjectProperty.check(prop)) {
          const oldName = ((prop as ObjectProperty).key as Identifier).name
          const newName = camelize(oldName)
          if (newName !== oldName) {
            newFields.properties.push(
              j.objectProperty.from({
                key: j.identifier(newName),
                value: j.identifier(newName),
                shorthand: true,
              })
            )
            oldFields.properties.push(
              j.objectProperty(j.identifier(newName), j.identifier(oldName))
            )
          }
        }
      })
      if (argsThatNeedRenaming.length < fieldMap.properties.length) {
        newFields.properties.push(j.spreadElement(j.identifier("_newFields")))
        oldFields.properties.push(j.spreadElement(j.identifier("_newFields")))
      }
      const source = recast.prettyPrint(
        j.blockStatement([
          j.variableDeclaration("const", [
            j.variableDeclarator(newFields, j.identifier("newFields")),
          ]),
          j.variableDeclaration("const", [
            j.variableDeclarator(j.identifier("oldFields"), oldFields),
          ]),
        ]),
        { tabWidth: 2 }
      ).code
      const comments = fieldMap.comments || []
      comments.push(j.commentBlock(`\n${source}\n`, false, true))
      fieldMap.comments = comments
    }
  })

  /**
   * Then rename actual input definition.
   */
  forEachInputFieldConfigMapProperty(
    collection,
    file,
    (fieldProp, fieldMap) => {
      renameFieldKey(fieldProp, fieldMap, file, j)
      const fieldConfig = fieldProp.value
      if (ObjectExpression.check(fieldConfig)) {
        const type = getProperty(fieldConfig, "type")!.value
        if (Identifier.check(type) && !type.name.startsWith("GraphQL")) {
          console.log(
            `Skipping renaming of nested input values in mutate function for ` +
              `custom input object type (${errorLocation(
                file,
                fieldProp.value
              )})`
          )
        }
      }
    }
  )

  return collection.toSource()
}

function intermediateName(name: string) {
  return `_${name}`
}

function renameFieldKey(
  fieldProp: ObjectProperty,
  fieldMap: ObjectExpression,
  file: FileInfo,
  j: JSCodeshift
) {
  const key = fieldProp.key as Identifier
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
      return true
    }
  }
  return false
}

function renameFunctionParams(
  argumentMap: ObjectExpression,
  fn: ExpressionKind | PatternKind,
  paramAtIndex: number,
  file: FileInfo,
  j: JSCodeshift
) {
  const argsThatNeedRenaming = propertiesWithSnakeCase(argumentMap)
  if (argsThatNeedRenaming.length === 0) {
    return
  }
  if (ArrowFunctionExpression.check(fn)) {
    const argsParam = fn.params[paramAtIndex]
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
        const newParamProperties: Array<ObjectProperty | SpreadElement> = []
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
            j.objectProperty(j.identifier(oldName), j.identifier(newName))
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
        if (argsThatNeedRenaming.length < argumentMap.properties.length) {
          paramProperties.push(
            j.restProperty(j.identifier(intermediateName(argsParam.name)))
          )
          newParamProperties.push(
            j.spreadElement(j.identifier(intermediateName(argsParam.name)))
          )
        }
        fn.params[paramAtIndex] = j.objectPattern(paramProperties)
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
        const resolveBody = fn.body
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
          `resolve function (${errorLocation(file, fn)})`
      )
    }
  }
}

function propertiesWithSnakeCase(object: ObjectExpression | ObjectPattern) {
  return (object.properties as any[]).filter(prop => {
    if (ObjectProperty.check(prop)) {
      return (prop.key as Identifier).name.includes("_")
    }
    return false
  }) as ObjectProperty[]
}

export const parser = "ts"
export default transform
