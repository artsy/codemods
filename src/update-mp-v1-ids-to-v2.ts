/**
 * 1. Run this codemod:
 *
 * In reaction...
 *
 *    ```bash
 *    $ SCHEMA_PATH="$PWD/../metaphysics/_schemaV2.graphql" yarn codemod update-mp-v1-ids-to-v2
 *    ```
 *
 */

import { Transform, TaggedTemplateExpression, Identifier } from "jscodeshift"
import {
  parse as parseGraphQL,
  print as printGraphQL,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  NameNode,
  FieldNode,
} from "graphql"
import { schema as promisedSchema } from "./helpers/getSchema"

const renameField = (field: FieldNode, newName: string) => ({
  ...field,
  name: {
    ...field.name,
    value: newName,
  },
})

const transform: Transform = async (file, api, _options) => {
  if (!file.source.includes("graphql`")) {
    return
  }
  const j = api.jscodeshift
  const collection = j(file.source)
  const schema = await promisedSchema
  const typeInfo = new TypeInfo(schema)

  collection
    .find(TaggedTemplateExpression, node => {
      const tag = node.tag
      return Identifier.check(tag) && tag.name === "graphql"
    })
    .forEach(path => {
      const templateElement = path.node.quasi.quasis[0]
      const graphqlDoc = parseGraphQL(templateElement.value.raw)

      const newGraphQLDoc = visit(
        graphqlDoc,
        visitWithTypeInfo(typeInfo, {
          Field(node, key, parent, path, ancestors) {
            if (node.name.value === "__id") {
              return renameField(node, "id")
            }
            if (node.name.value === "_id") {
              return renameField(node, "internalID")
            }
            if (node.name.value === "id") {
              const parentType = typeInfo.getParentType()
              const parentFields =
                (parentType &&
                  parentType.astNode.fields.map(field => field.name.value)) ||
                []
              if (
                parentFields.includes("slug") &&
                parentFields.includes("internalID")
              ) {
                return renameField(node, "slug")
              } else if (parentFields.includes("internalID")) {
                return renameField(node, "internalID")
              }
              return renameField(node, "sludORinternalID")
            }
            return undefined
          },
          Argument: argNode => {
            const oldName = argNode.name.value
            if (oldName === "__id") {
              const name: NameNode = {
                kind: "Name",
                value: "id",
              }
              return {
                ...argNode,
                name,
              }
            }
            return undefined
          },
        })
      )

      // @ts-ignore
      const newGraphQLDocSource = printGraphQL(newGraphQLDoc, {
        commentDescriptions: true,
      })
      const newTemplateElement = j.templateElement(
        {
          cooked: newGraphQLDocSource,
          raw: newGraphQLDocSource,
        },
        templateElement.tail
      )
      path.node.quasi.quasis[0] = newTemplateElement
    })

  return collection.toSource()
}

export default transform
export const parser = "tsx"
