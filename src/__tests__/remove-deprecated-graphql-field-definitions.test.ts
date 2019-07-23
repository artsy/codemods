import { defineTest } from "jscodeshift/src/testUtils"

// const consoleLog = console.log
// beforeAll(() => {
//   console.log = jest.fn()
// })
// afterAll(() => {
//   console.log = consoleLog
// })

defineTest(
  __dirname,
  "remove-deprecated-graphql-field-definitions",
  null,
  undefined,
  "ts"
)
