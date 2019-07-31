/**
 * 1. First remove deprecated fields from the schema, as there will likely be
 *    some fields that were already renamed to `camelCase` and the `snake_case`
 *    was deprecated.
 *
 * 2. Run this codemod, and you likely want to filter out these warnings:
 *
 *    ```bash
 *    $ jscodeshift --extensions=ts --ignore-pattern='src/schema/v2/*' \
 *                  --transform=../codemods/src/remove-deprecated-graphql-field-definitions.ts \
 *                  src/schema \
 *      | grep -v -E 'spread of.+Field|field config by variable reference|function call `(markdown|initials|amount|filterArtworks|numeral|money)'
 *    ```
 *
 * 3. Run the `remove-blank-lines-from-unstaged-changes` script.
 *
 * 4. Run prettier: `yarn prettier-project`
 *
 * 5. Run the type-checker and find places where field configs/types were
 *    emptied but not yet their references: `yarn type-check -w`
 *
 * 6. Dump the schema and look for left-over deprecations: `yarn dump:local`
 */

import {
  Transform,
  NewExpression,
  Identifier,
  ObjectExpression,
  ObjectProperty,
} from "jscodeshift"

import { errorLocation } from "./helpers/errorLocation"
import { getProperty } from "./helpers/getProperty"
import {
  forEachOutputFieldConfigMapProperty,
  forEachOutputFieldConfig,
  getFieldConfig,
} from "./helpers/graphqlSchemaDefinition"

const transform: Transform = (file, api, _options) => {
  const j = api.jscodeshift
  const collection = j(file.source)

  /**
   * First remove object properties that hold field configs.
   */
  forEachOutputFieldConfigMapProperty(
    collection,
    file,
    (fieldProp, fieldMap) => {
      const fieldConfig = getFieldConfig(fieldProp, file)
      if (fieldConfig) {
        const deprecationReason = getProperty(fieldConfig, "deprecationReason")
        if (deprecationReason) {
          const fieldPropKey = (fieldProp.key as Identifier).name
          const index = fieldMap.properties.findIndex(
            prop =>
              ObjectProperty.check(prop) &&
              (prop.key as Identifier).name === fieldPropKey
          )
          fieldMap.properties.splice(index, 1)
        }
      }
    }
  )

  /**
   * Now find just field configs and clear them so the type-checker will
   * complain, making it easy to manually clean them and their references up.
   */
  forEachOutputFieldConfig(collection, file, fieldConfig => {
    if (getProperty(fieldConfig, "deprecationReason")) {
      fieldConfig.properties = []
    }
  })

  /**
   * Find deprecated values in enum types.
   */
  collection
    .find(NewExpression, node => {
      const callee = node.callee
      return Identifier.check(callee) && callee.name === "GraphQLEnumType"
    })
    .forEach(path => {
      const config = path.node.arguments[0] as ObjectExpression
      const values = getProperty(config, "values")!.value
      if (ObjectExpression.check(values)) {
        values.properties = values.properties.filter(prop => {
          if (ObjectProperty.check(prop)) {
            const value = prop.value
            if (ObjectExpression.check(value)) {
              if (getProperty(value, "deprecationReason")) {
                return false
              }
            } else {
              throw new Error(
                `Unexpected enum value type ${value.type} (${errorLocation(
                  file,
                  value
                )})`
              )
            }
          }
          return true
        })
      } else if (Identifier.check(values)) {
        console.log(
          `Skipping enum values by variable reference (${errorLocation(
            file,
            values
          )})`
        )
      }
    })

  return collection.toSource()
}

export const parser = "ts"
export default transform
