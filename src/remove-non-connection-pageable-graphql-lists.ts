/**
 * 1. Run this codemod, and you likely want to filter out these warnings:
 *
 *    ```bash
 *    $ jscodeshift --extensions=ts --ignore-pattern='src/schema/v2/*' \
 *                  --transform=../codemods/src/remove-non-connection-pageable-graphql-lists.ts \
 *                  src/schema \
 *      | grep -v -E 'spread of.+Field|field config by variable reference|function call `(markdown|initials|amount|filterArtworks|numeral|money)'
 *    ```
 *
 * 3. Run the type-checker and find places where field configs/types were
 *    emptied but not yet their references: `yarn type-check -w`
 *
 * 4. Run the `remove-blank-lines-from-unstaged-changes` script.
 *
 * 5. Run prettier: `yarn prettier-project`
 *
 * 6. Dump the schema and look for connections not renamed: `yarn dump:local`
 */

import {
  Transform,
  NewExpression,
  Identifier,
  ObjectProperty,
} from "jscodeshift"

import { errorLocation } from "./helpers/errorLocation"
import { getProperty } from "./helpers/getProperty"
import {
  forEachOutputFieldConfigMapProperty,
  getFieldConfig,
  getArgumentMap,
} from "./helpers/graphqlSchemaDefinition"

const transform: Transform = (file, api, _options) => {
  const j = api.jscodeshift
  const collection = j(file.source)

  forEachOutputFieldConfigMapProperty(
    collection,
    file,
    (fieldProp, fieldMap) => {
      const fieldConfig = getFieldConfig(fieldProp, file)
      if (fieldConfig) {
        const fieldPropKey = (fieldProp.key as Identifier).name

        const argsProperty = getProperty(fieldConfig, "args")
        if (argsProperty) {
          const argsMap = getArgumentMap(argsProperty, file)
          if (
            argsMap &&
            (getProperty(argsMap, "size") || getProperty(argsMap, "limit"))
          ) {
            const type = getProperty(fieldConfig, "type")!.value
            if (
              NewExpression.check(type) &&
              (type.callee as Identifier).name === "GraphQLList"
            ) {
              const index = fieldMap.properties.findIndex(
                prop =>
                  ObjectProperty.check(prop) &&
                  (prop.key as Identifier).name === fieldPropKey
              )
              fieldMap.properties.splice(index, 1)
            } else {
              console.log(
                `Skipping type not defined as GraphQLList inline (${errorLocation(
                  file,
                  type
                )})`
              )
            }
          }
        }

        const match = fieldPropKey.match(/^(.+?)(_c|C)onnection$/)
        if (match) {
          const newName = match[1]
          console.log(newName)
          if (!getProperty(fieldMap, newName)) {
            fieldProp.key = j.identifier(newName)
          } else {
            console.log(
              `Skipping renaming of connection as a field with the new name exists (${errorLocation(
                file,
                fieldProp
              )})`
            )
          }
        }
      }
    }
  )

  return collection.toSource()
}

export const parser = "ts"
export default transform
