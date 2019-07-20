/**
 * First remove deprecated fields from the schema, as there will likely be some
 * fields that were already renamed to `camelCase` and the `snake_case` was
 * deprecated.
 *
 * You will want to run the `remove-blank-lines-from-unstaged-changes` script after performing this codemod.
 *
 * jscodeshift --transform=/Users/eloy/Code/Artsy/codemods/src/update-graphql-field-definition-case.ts --extensions=ts src/schema && /Users/eloy/Code/Artsy/codemods/scripts/remove-blank-lines-from-unstaged-changes && yarn prettier-project
 */

import {
  Transform,
  ObjectExpression,
  Identifier,
  CallExpression,
} from "jscodeshift"

import { errorLocation } from "./helpers/errorLocation"
import { getProperty } from "./helpers/getProperty"
import { forEachFieldConfigMapProperty } from "./helpers/graphqlSchemaDefinition"

const transform: Transform = (file, api, _options) => {
  const j = api.jscodeshift
  return forEachFieldConfigMapProperty(
    j(file.source),
    file,
    (prop, fieldMap) => {
      const fieldConfig = prop.value
      if (ObjectExpression.check(fieldConfig)) {
        const deprecationReason = getProperty(fieldConfig, "deprecationReason")
        if (deprecationReason) {
          const index = fieldMap.properties.findIndex(p => p === prop)
          fieldMap.properties.splice(index, 1)
        }
      } else if (CallExpression.check(fieldConfig)) {
        console.log(
          `Skipping deprecation check for field defined through call expression \`${
            (fieldConfig.callee as Identifier).name
          }(…)\` (${errorLocation(file, fieldConfig)})`
        )
      }
    }
  ).toSource()
}

export const parser = "ts"
export default transform
