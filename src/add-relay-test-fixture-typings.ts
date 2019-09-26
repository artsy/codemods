/**
 * 1. Update any direct usage of MockRelayRenderer to use renderRelayTree.
 *
 * 2. Run this codemod:
 *
 *    ```bash
 *    $ jscodeshift --extensions=ts,tsx \
 *      --transform=../codemods/src/add-relay-test-fixture-typings.ts \
 *      --ignore-pattern='**\/renderRelayTree-tests.tsx' \
 *      src\/**\/*-tests.ts*
 *    ```
 *
 *    Or in Reaction, which uses a different test file naming scheme:
 *
 *    ```bash
 *    $ jscodeshift --extensions=ts,tsx \
 *      --transform=../codemods/src/add-relay-test-fixture-typings.ts \
 *      --ignore-pattern='**\/renderRelayTree-tests.tsx' \
 *      src\/**\/*.test.ts*
 *    ```
 *
 * 2. Run prettier: `yarn prettier-project`
 *
 * 2. This codemod will result in comments in GraphQL documents being lost, so
 *    review for such changes that may need to be reverted.
 *
 * 2. Commit.
 *
 * 2. Make not of all the mentions of deprecated usage of `mockResolvers` and
 *    update those places to use mockData without relying on type names, as
 *    those will not work with the emitted raw response typings.
 *
 * 2. Commit.
 *
 * 3. Run relay-compiler: `yarn relay`
 *
 * 4. Run type-checker: `yarn type-check -w`.
 *
 *    Go through tests and manually annotate fixtures used in different ways.
 *    E.g. the codemod will type fixture data as its raw response type in the
 *    place it is used (`mockData: {…} as FooRawResponse`), whereas it’s
 *    technically slightly better to annotate the actual fixture definition
 *    instead.
 *
 * 2. Fix tests: `yarn jest --watch`
 *
 * 2. Done.
 */

import {
  Transform,
  CallExpression,
  Identifier,
  ObjectExpression,
  Program,
  TaggedTemplateExpression,
  ObjectProperty,
} from "jscodeshift"
import { parse as parseGraphQL, print as printGraphQL, visit } from "graphql"
import { getProperty } from "./helpers/getProperty"
import { errorLocation } from "./helpers/errorLocation"

const transform: Transform = (file, api, _options) => {
  const j = api.jscodeshift
  const collection = j(file.source)

  const operations: string[] = []

  collection
    .find(CallExpression, node => {
      const callee = node.callee
      return (
        Identifier.check(callee) &&
        (callee.name === "renderRelayTree" || callee.name === "createTestEnv")
      )
    })
    .forEach(path => {
      const testHelperCallExpression = path.node
      const options = testHelperCallExpression.arguments[0]
      if (ObjectExpression.check(options)) {
        // Add @raw_response_type directive
        const query = getProperty(options, "query")!.value
        if (TaggedTemplateExpression.check(query)) {
          const templateElement = query.quasi.quasis[0]
          const graphqlDoc = parseGraphQL(templateElement.value.raw)
          const newGraphQLDoc = visit(graphqlDoc, {
            OperationDefinition: operationNode => {
              operations.push(operationNode.name!.value)
              return {
                ...operationNode,
                directives: [
                  ...(operationNode.directives || []),
                  {
                    kind: "Directive",
                    name: { kind: "Name", value: "raw_response_type" },
                  },
                ],
              }
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
          query.quasi.quasis[0] = newTemplateElement
        } else {
          console.log(`Unexpected query type (${errorLocation(file, query)})`)
          return
        }

        // Add fixture data typing
        let mockData: ObjectProperty | null = null
        if (
          Identifier.check(testHelperCallExpression.callee) &&
          testHelperCallExpression.callee.name === "renderRelayTree"
        ) {
          // renderRelayTree
          mockData = getProperty(options, "mockData")
          if (!mockData) {
            mockData = getProperty(options, "mockResolvers")
            if (mockData) {
              console.log(
                `Update deprecated usage of mockResolvers to use mockData ` +
                  `instead! (${errorLocation(file, mockData.key)})`
              )
            }
          }
        } else {
          // createTestEnv
          mockData = getProperty(options, "defaultData")
        }
        if (!mockData) {
          throw new Error("Missing mockData/mockResolvers")
        } else {
          const data = mockData.value
          if (
            ObjectExpression.check(data) ||
            CallExpression.check(data) ||
            Identifier.check(data)
          ) {
            mockData.value = j.tsAsExpression.from({
              expression: data,
              typeAnnotation: j.tsTypeReference(
                j.identifier(`${operations[operations.length - 1]}RawResponse`)
              ),
            })
            if (!ObjectExpression.check(data)) {
              console.log(
                `Usage of a value other than an object literal may pass ` +
                  `type-checking when it isn't supposed to, be sure to check ` +
                  `that the result is being typed and not as \`any\` ` +
                  `(${errorLocation(file, data)})`
              )
            }
          } else {
            console.log(
              `Unexpected mockResolvers/mockData value type (${errorLocation(
                file,
                mockData.value
              )})`
            )
          }
        }
      } else {
        throw new Error("Unexpected argument type")
      }
    })

  if (operations.length > 0) {
    collection.find(Program).forEach(path => {
      const body = path.node.body
      operations.forEach(operation => {
        body.unshift(
          j.importDeclaration(
            [j.importSpecifier(j.identifier(`${operation}RawResponse`))],
            j.literal(`__generated__/${operation}.graphql`)
          )
        )
      })
    })
  }

  return collection.toSource()
}

export default transform
export const parser = "tsx"
