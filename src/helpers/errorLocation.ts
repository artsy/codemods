import { FileInfo, Node } from "jscodeshift"

export function errorLocation(file: FileInfo, node: Node) {
  return `${file.path}:${node.loc!.start.line}:${node.loc!.start.column}`
}
