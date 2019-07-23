import { Transform, TaggedTemplateExpression, Identifier } from "jscodeshift"
import {
  parse as parseGraphQL,
  print as printGraphQL,
  visit,
  NameNode,
} from "graphql"
import { camelize } from "./helpers/camelize"

const transform: Transform = (file, api, _options) => {
  const j = api.jscodeshift
  const collection = j(file.source)

  collection
    .find(TaggedTemplateExpression, node => {
      const tag = node.tag
      return Identifier.check(tag) && tag.name === "graphql"
    })
    .forEach(path => {
      const templateElement = path.node.quasi.quasis[0]
      const graphqlDoc = parseGraphQL(templateElement.value.raw)
      let isMutation = false
      const newGraphQLDoc = visit(graphqlDoc, {
        OperationDefinition: operationNode => {
          isMutation = operationNode.operation === "mutation"
        },
        Field: fieldNode => {
          const oldName = fieldNode.name.value
          const newName = camelize(oldName)
          if (newName !== oldName) {
            const name: NameNode = {
              kind: "Name",
              value: newName,
            }
            const alias: NameNode = fieldNode.alias || {
              kind: "Name",
              value: oldName,
            }
            return {
              ...fieldNode,
              alias,
              name,
            }
          }
          return undefined
        },
        Argument: argNode => {
          const oldName = argNode.name.value
          const newName = camelize(oldName)
          if (newName !== oldName) {
            const name: NameNode = {
              kind: "Name",
              value: newName,
            }
            return {
              ...argNode,
              name,
            }
          }
          return undefined
        },
      })
      const newGraphQLDocSource = printGraphQL(newGraphQLDoc)
      const newTemplateElement = j.templateElement(
        {
          cooked: newGraphQLDocSource,
          raw: newGraphQLDocSource,
        },
        templateElement.tail
      )
      path.node.quasi.quasis[0] = newTemplateElement

      if (isMutation) {
        const comments = path.node.comments || []
        comments.push(j.commentLine(" TODO: Inputs to the mutation might have changed case of the keys!"))
        path.node.comments = comments
      }
    })

  return collection.toSource()
}

export default transform
export const parser = "tsx"
