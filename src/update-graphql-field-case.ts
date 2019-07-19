/**
 * You will want to run the `remove-blank-lines-from-unstaged-changes` script after performing this codemod.
 */

import {
  Transform,
  ObjectExpression,
  ObjectProperty,
  Identifier,
  NewExpression,
  ArrowFunctionExpression,
  StringLiteral,
  SpreadElement,
  CallExpression,
  FileInfo,
  Node,
} from "jscodeshift"

const transform: Transform = (file, api, options) => {
  const j = api.jscodeshift

  return j(file.source)
    .find(NewExpression, node => {
      const callee = node.callee
      return (
        Identifier.check(callee) &&
        (callee.name === "GraphQLObjectType" ||
          callee.name === "GraphQLInterfaceType")
      )
    })
    .replaceWith(path => {
      const node = path.node
      const config = node.arguments[0]
      if (ObjectExpression.check(config)) {
        const fields = unpackThunk(get(config, "fields")!, file)
        fields.properties.forEach(prop => {
          if (ObjectProperty.check(prop)) {
            const key = prop.key as Identifier
            if (key.name === "__id") {
              console.log(
                `Skipping \`__id\` field (${errorLocation(file, prop)})`
              )
            } else if (key.name.includes("_")) {
              const oldName = key.name
              const newName = camelize(oldName)
              prop.key = j.identifier(newName)
              const fieldConfig = prop.value
              if (ObjectExpression.check(fieldConfig)) {
                const resolve = get(fieldConfig, "resolve")
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
          } else if (SpreadElement.check(prop)) {
            console.log(
              `Skip spread of \`${
                (prop.argument as Identifier).name
              }\` (${errorLocation(file, prop)})`
            )
          } else {
            throw new Error(
              `Unknown property type \`${prop.type}\` (${errorLocation(
                file,
                prop
              )})`
            )
          }
        })
      } else {
        throw new Error(
          `Expected a config object (${errorLocation(file, config)})`
        )
      }
      return node
    })
    .toSource()
}

function errorLocation(file: FileInfo, node: Node) {
  return `${file.path}:${node.loc!.start.line}:${node.loc!.start.column}`
}

function get(object: ObjectExpression, key: string) {
  const found = object.properties.find(prop => {
    if (ObjectProperty.check(prop)) {
      const k = prop.key
      return Identifier.check(k) && k.name === key
    }
    return false
  })
  return found as ObjectProperty | null
}

function unpackThunk(property: ObjectProperty, file: FileInfo) {
  const value = property.value
  if (ObjectExpression.check(value)) {
    return value
  } else if (ArrowFunctionExpression.check(value)) {
    const body = value.body
    if (ObjectExpression.check(body)) {
      return body
    } else {
      throw new Error(
        `Expected thunk function to only return an object (${errorLocation(
          file,
          body
        )})`
      )
    }
  } else {
    throw new Error(
      `Expected the \`fields\` key to hold either an object or an arrow function (${errorLocation(
        file,
        value
      )})`
    )
  }
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
  try {
    return [
      components[0],
      components
        .slice(1)
        .map(c => c[0].toUpperCase() + c.substring(1))
        .join(""),
    ].join("")
  } catch (error) {
    console.log(input)
    throw error
  }
}

export const parser = "ts"
export default transform
