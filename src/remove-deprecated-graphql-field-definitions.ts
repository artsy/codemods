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
import {
  forEachOutputFieldConfigMapProperty,
  getFieldConfig,
} from "./helpers/graphqlSchemaDefinition"

const transform: Transform = (file, api, _options) => {
  const j = api.jscodeshift
  return forEachOutputFieldConfigMapProperty(
    j(file.source),
    file,
    (prop, fieldMap) => {
      const fieldConfig = getFieldConfig(prop, file)
      if (fieldConfig) {
        const deprecationReason = getProperty(fieldConfig, "deprecationReason")
        if (deprecationReason) {
          const index = fieldMap.properties.findIndex(p => p === prop)
          fieldMap.properties.splice(index, 1)
        }
      }
    }
  ).toSource()
}

export const parser = "ts"
export default transform
