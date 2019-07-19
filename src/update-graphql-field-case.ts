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
  ObjectProperty,
  Identifier,
  NewExpression,
  ArrowFunctionExpression,
  VariableDeclarator,
  SpreadElement,
  CallExpression,
  FileInfo,
  Node,
  TSTypeAnnotation,
  TSTypeReference,
  JSCodeshift,
  BlockStatement,
  ReturnStatement,
} from "jscodeshift"

const transform: Transform = (file, api, options) => {
  const j = api.jscodeshift
  const collection = j(file.source)

  collection
    .find(VariableDeclarator, node => {
      const typeAnnotation = (node.id as Identifier).typeAnnotation
      if (TSTypeAnnotation.check(typeAnnotation)) {
        const typeReference = typeAnnotation.typeAnnotation
        if (TSTypeReference.check(typeReference)) {
          const typeReferenceName = (typeReference.typeName as Identifier).name
          if (typeReferenceName === "GraphQLFieldConfigMap") {
            return true
          } else if (typeReferenceName === "Thunk") {
            const thunkTypeReference = typeReference.typeParameters!.params[0]
            if (
              TSTypeReference.check(thunkTypeReference) &&
              (thunkTypeReference.typeName as Identifier).name ===
                "GraphQLFieldConfigMap"
            ) {
              return true
            } else {
              throw new Error("Unexpected Thunk<…> type parameter.")
            }
          }
        }
      }
      return false
    })
    .replaceWith(path => {
      const node = path.node
      processFields(path.node.init!, j, file)
      return node
    })

  collection
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
        const fieldsProp = get(config, "fields")!
        processFields(fieldsProp.value, j, file)
      } else {
        throw new Error(
          `Expected a config object (${errorLocation(file, config)})`
        )
      }
      return node
    })

  return collection.toSource()
}

function processFields(fieldsThunk: Node, j: JSCodeshift, file: FileInfo) {
  const fields = unpackThunk(fieldsThunk, file)
  if (!fields) {
    return
  }
  fields.properties.forEach(prop => {
    if (ObjectProperty.check(prop)) {
      const key = prop.key as Identifier
      if (key.name === "__id") {
        console.log(`Skipping \`__id\` field (${errorLocation(file, prop)})`)
      } else if (key.name.includes("_")) {
        const oldName = key.name
        const newName = camelize(oldName)
        if (get(fields, newName)) {
          console.log(
            `Skipping renaming \`${oldName}\` as another field by the ` +
              `name of \`${newName}\` already exists and is presumed ` +
              `to supersede it (${errorLocation(file, prop)})`
          )
        } else {
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
      }
    } else if (SpreadElement.check(prop)) {
      console.log(
        `Skipping spread of \`${
          (prop.argument as Identifier).name
        }\` (${errorLocation(file, prop)})`
      )
    } else {
      throw new Error(
        `Unknown property type \`${prop.type}\` (${errorLocation(file, prop)})`
      )
    }
  })
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

function unpackThunk(thunk: Node, file: FileInfo) {
  if (ObjectExpression.check(thunk)) {
    return thunk
  } else if (ArrowFunctionExpression.check(thunk)) {
    const body = thunk.body
    if (ObjectExpression.check(body)) {
      return body
    } else {
      if (BlockStatement.check(body)) {
        const lastStatement = body.body[body.body.length - 1]
        if (ReturnStatement.check(lastStatement)) {
          const returnArg = lastStatement.argument
          if (ObjectExpression.check(returnArg)) {
            return returnArg
          }
        }
      }
    }
    console.log(
      `Skipping fields of thunk function that does not return a simple ` +
        `object (${errorLocation(file, body)})`
    )
  } else if (Identifier.check(thunk)) {
    console.log(
      `Skipping fields declared as variable reference (${errorLocation(
        file,
        thunk
      )})`
    )
  } else {
    console.log(
      `Skipping fields that do not hold either an object or a trivial arrow ` +
        `function (${errorLocation(file, thunk)})`
    )
  }
  return null
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
