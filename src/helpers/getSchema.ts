import { buildSchema } from "graphql"
import { readFile } from "fs"
import { promisify } from "util"
import { join } from "path"

const read = promisify(readFile)

export const schema = read(join(__dirname, "../../data/schema.graphql")).then(
  file => buildSchema(file.toString())
)
