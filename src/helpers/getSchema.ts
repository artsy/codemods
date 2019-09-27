import { readFile } from "fs"
import { promisify } from "util"

const read = promisify(readFile)

export const schema = process.env.SCHEMA_PATH
  ? read(process.env.SCHEMA_PATH).then(file => file.toString())
  : Promise.resolve(false)
