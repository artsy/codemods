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
  BlockStatement,
  ReturnStatement,
} from "jscodeshift"
import { Collection } from "jscodeshift/src/Collection"
import { ExpressionKind } from "ast-types/gen/kinds"

import { errorLocation } from "./errorLocation"
import { getProperty } from "./getProperty"
import { schema } from "./getSchema"

export function forEachArgumentMap(
  collection: Collection<any>,
  file: FileInfo,
  callback: (argumentMap: ObjectExpression) => void
) {
  forEachOutputFieldConfig(collection, file, fieldConfig => {
    const argsProp = getProperty(fieldConfig, "args")
    if (ObjectProperty.check(argsProp)) {
      const argumentMap = getArgumentMap(argsProp, file)
      if (argumentMap) {
        callback(argumentMap)
      }
    }
  })

  collection
    .find(VariableDeclarator, node => {
      const typeAnnotation = (node.id as Identifier).typeAnnotation
      if (TSTypeAnnotation.check(typeAnnotation)) {
        const typeReference = typeAnnotation.typeAnnotation
        if (TSTypeReference.check(typeReference)) {
          const typeReferenceName = (typeReference.typeName as Identifier).name
          if (typeReferenceName === "GraphQLFieldConfigArgumentMap") {
            return true
          }
        }
      }
      return false
    })
    .forEach(path => {
      const argumentMap = path.node.init!
      if (ObjectExpression.check(argumentMap)) {
        callback(argumentMap)
      } else {
        console.log(
          `Skipping args that isn't defined as an object expression ${errorLocation(
            file,
            argumentMap
          )}`
        )
      }
    })

  return collection
}

export function getArgumentMap(prop: ObjectProperty, file: FileInfo) {
  let argumentMap = prop.value
  if (CallExpression.check(argumentMap)) {
    if ((argumentMap.callee as Identifier).name === "pageable") {
      argumentMap = argumentMap.arguments[0] as ExpressionKind
    }
  }
  if (ObjectExpression.check(argumentMap)) {
    return argumentMap
  } else if (argumentMap) {
    console.log(
      `Skipping args that isn't defined as an object expression ${errorLocation(
        file,
        argumentMap
      )}`
    )
  }
  return null
}

export function forEachOutputFieldConfig(
  collection: Collection<any>,
  file: FileInfo,
  callback: (
    fieldConfig: ObjectExpression,
    property: ObjectProperty | null,
    fieldMap: ObjectExpression | null
  ) => void
) {
  forEachOutputFieldConfigMapProperty(collection, file, (prop, fieldMap) => {
    const fieldConfig = getFieldConfig(prop, file)
    if (fieldConfig) {
      callback(fieldConfig, prop, fieldMap)
    }
  })

  collection
    .find(VariableDeclarator, node => {
      const typeAnnotation = (node.id as Identifier).typeAnnotation
      if (TSTypeAnnotation.check(typeAnnotation)) {
        const typeReference = typeAnnotation.typeAnnotation
        if (TSTypeReference.check(typeReference)) {
          const typeReferenceName = (typeReference.typeName as Identifier).name
          if (typeReferenceName === "GraphQLFieldConfig") {
            return true
          }
        }
      }
      return false
    })
    .forEach(path => {
      const fieldConfig = path.node.init!
      if (ObjectExpression.check(fieldConfig)) {
        callback(fieldConfig, null, null)
      }
    })

  return collection
}

export function forEachOutputFieldConfigMapProperty(
  collection: Collection<any>,
  file: FileInfo,
  callback: (property: ObjectProperty, fieldMap: ObjectExpression) => void
) {
  forEachOutputFieldConfigMap(collection, file, fieldMap => {
    withFieldConfigMapProperty(fieldMap, file, callback)
  })
  return collection
}

export function forEachOutputFieldConfigMap(
  collection: Collection<any>,
  file: FileInfo,
  callback: (fieldMap: Node) => void
) {
  forEachFieldConfigMapVariable(
    collection,
    "GraphQLFieldConfigMap",
    file,
    callback
  )

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
    })

  forEachMutationConfig(collection, file, mutationConfig => {
    const outputFields = unpackThunk(
      getProperty(mutationConfig, "outputFields")!.value,
      file
    )
    if (outputFields) {
      callback(outputFields)
    }
  })

  return collection
}

export function forEachInputFieldConfigMapProperty(
  collection: Collection<any>,
  file: FileInfo,
  callback: (property: ObjectProperty, fieldMap: ObjectExpression) => void
) {
  forEachInputFieldConfigMap(collection, file, fieldMap => {
    withFieldConfigMapProperty(fieldMap, file, callback)
  })
  return collection
}

export function forEachInputFieldConfigMap(
  collection: Collection<any>,
  file: FileInfo,
  callback: (fieldMap: ObjectExpression) => void
) {
  forEachFieldConfigMapVariable(
    collection,
    "GraphQLInputFieldConfigMap",
    file,
    callback
  )

  forEachMutationConfig(collection, file, mutationConfig => {
    const inputFields = unpackThunk(
      getProperty(mutationConfig, "inputFields")!.value,
      file
    )
    if (inputFields) {
      callback(inputFields)
    }
  })

  collection
    .find(NewExpression, node => {
      const callee = node.callee
      return (
        Identifier.check(callee) && callee.name === "GraphQLInputObjectType"
      )
    })
    .forEach(path => {
      const node = path.node
      const config = node.arguments[0]
      if (ObjectExpression.check(config)) {
        const fieldMap = unpackThunk(getProperty(config, "fields")!.value, file)
        if (fieldMap) {
          callback(fieldMap)
        }
      } else {
        throw new Error(
          `Expected a config object (${errorLocation(file, config)})`
        )
      }
    })

  return collection
}

export function forEachMutationConfig(
  collection: Collection<any>,
  file: FileInfo,
  callback: (mutationConfig: ObjectExpression) => void
) {
  const yieldMutationConfig = (mutationConfig: Node) => {
    if (ObjectExpression.check(mutationConfig)) {
      callback(mutationConfig)
    } else {
      console.log(
        `Skipping mutation config that's not defined as object expression (${errorLocation(
          file,
          mutationConfig
        )})`
      )
    }
  }

  collection
    .find(VariableDeclarator, node => {
      const typeAnnotation = (node.id as Identifier).typeAnnotation
      if (TSTypeAnnotation.check(typeAnnotation)) {
        const typeReference = typeAnnotation.typeAnnotation
        if (TSTypeReference.check(typeReference)) {
          const typeReferenceName = (typeReference.typeName as Identifier).name
          if (typeReferenceName === "MutationConfig") {
            return true
          }
        }
      }
      return false
    })
    .forEach(path => {
      yieldMutationConfig(path.node.init!)
    })

  collection.find(CallExpression, node => {
    if ((node.callee as Identifier).name === "mutationWithClientMutationId") {
      yieldMutationConfig(node.arguments[0])
    }
  })
}

function withFieldConfigMapProperty(
  thunk: Node,
  file: FileInfo,
  callback: (property: ObjectProperty, fieldMap: ObjectExpression) => void
) {
  const fieldMap = unpackThunk(thunk, file)
  if (fieldMap) {
    // Mutating an array while iterating over it leads to hurt
    const props = [...fieldMap.properties]
    props.forEach((prop, i) => {
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
}

function forEachFieldConfigMapVariable(
  collection: Collection<any>,
  typeName: string,
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
          if (typeReferenceName === typeName) {
            return true
          } else if (typeReferenceName === "Thunk") {
            const thunkTypeReference = typeReference.typeParameters!.params[0]
            return (
              TSTypeReference.check(thunkTypeReference) &&
              (thunkTypeReference.typeName as Identifier).name === typeName
            )
          }
        }
      }
      return false
    })
    .forEach(path => {
      callback(path.node.init!)
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

export function getFieldConfig(prop: ObjectProperty, file: FileInfo) {
  const fieldConfig = prop.value
  if (ObjectExpression.check(fieldConfig)) {
    return fieldConfig
  } else if (Identifier.check(fieldConfig)) {
    console.log(
      `Skipping field config by variable reference (${errorLocation(
        file,
        fieldConfig
      )})`
    )
  } else if (CallExpression.check(fieldConfig)) {
    console.log(
      `Skipping field config from function call \`${
        (fieldConfig.callee as Identifier).name
      }(…)\` (${errorLocation(file, fieldConfig)})`
    )
  }
  return null
}
