import { buildSchema } from "graphql"
import { readFile } from "fs"
import { promisify } from "util"

const read = promisify(readFile)

export const schema = process.env.SCHEMA_PATH
  ? read(process.env.SCHEMA_PATH).then(file => buildSchema(file.toString()))
  : Promise.reject(`SCHEMA_PATH env var must be set`)
