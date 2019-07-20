/**
 * First remove deprecated fields from the schema, as there will likely be some
 * fields that were already renamed to `camelCase` and the `snake_case` was
 * deprecated.
 *
 * You will want to run the `remove-blank-lines-from-unstaged-changes` script after performing this codemod.
 *
 * jscodeshift --transform=/Users/eloy/Code/Artsy/codemods/src/update-graphql-field-case.ts --extensions=ts src/schema && /Users/eloy/Code/Artsy/codemods/scripts/remove-blank-lines-from-unstaged-changes && yarn prettier-project
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
  return forEachFieldConfigMapProperty(j(file.source), file, (prop, fields) => {
    const key = prop.key as Identifier
    if (key.name === "__id") {
      console.log(`Skipping \`__id\` field (${errorLocation(file, prop)})`)
    } else if (key.name.includes("_")) {
      const oldName = key.name
      const newName = camelize(oldName)
      if (getProperty(fields, newName)) {
        console.log(
          `Skipping renaming \`${oldName}\` as another field by the ` +
            `name of \`${newName}\` already exists and is presumed ` +
            `to supersede it (${errorLocation(file, prop)})`
        )
      } else {
        prop.key = j.identifier(newName)
        const fieldConfig = prop.value
        if (ObjectExpression.check(fieldConfig)) {
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
        } else if (CallExpression.check(fieldConfig)) {
          console.log(
            `Skipping addition of resolver for call expression \`${
              (fieldConfig.callee as Identifier).name
            }(…)\` (${errorLocation(file, fieldConfig)})`
          )
        }
      }
    }
  }).toSource()
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
