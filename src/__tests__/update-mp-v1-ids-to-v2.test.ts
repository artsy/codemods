import { defineTest } from "jscodeshift/src/testUtils"

// const consoleLog = console.log
// beforeAll(() => {
//   console.log = jest.fn()
// })
// afterAll(() => {
//   console.log = consoleLog
// })

const fakeSchema = `
type Artist {
  # A globally unique ID.
  id: ID!

  # A slug ID.
  slug: ID!

  # A type-specific ID likely used as a database ID.
  internalID: ID!
}

type Query {
  artist: Artist
  artists: [Artist!]
}
`

defineTest(
  __dirname,
  "update-mp-v1-ids-to-v2",
  { schema: fakeSchema },
  undefined,
  "ts"
)
