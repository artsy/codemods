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
import { Collection } from "jscodeshift/src/Collection"

import { errorLocation } from "./errorLocation"
import { getProperty } from "./getProperty"

export function forEachFieldConfigMapProperty(
  collection: Collection<any>,
  file: FileInfo,
  callback: (property: ObjectProperty, fieldMap: ObjectExpression) => void
) {
  return forEachFieldConfigMap(collection, file, thunk => {
    const fieldMap = unpackThunk(thunk, file)
    if (fieldMap) {
      fieldMap.properties.forEach((prop, i) => {
        if (ObjectProperty.check(prop)) {
          callback(prop, fieldMap)
        } else if (SpreadElement.check(prop)) {
          console.log(
            `Skipping spread of \`${
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
    }
  })
}

export function forEachFieldConfigMap(
  collection: Collection<any>,
  file: FileInfo,
  callback: (thunk: Node) => void
) {
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
              throw new Error(
                `Unexpected Thunk<…> type parameter (${errorLocation(
                  file,
                  thunkTypeReference
                )})`
              )
            }
          }
        }
      }
      return false
    })
    .forEach(path => {
      const node = path.node
      callback(path.node.init!)
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
    .forEach(path => {
      const node = path.node
      const config = node.arguments[0]
      if (ObjectExpression.check(config)) {
        callback(getProperty(config, "fields")!.value)
      } else {
        throw new Error(
          `Expected a config object (${errorLocation(file, config)})`
        )
      }
      return node
    })

  return collection
}

export function unpackThunk(thunk: Node, file: FileInfo) {
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
