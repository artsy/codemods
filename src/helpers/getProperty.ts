import {
  Identifier,
  ObjectExpression,
  ObjectPattern,
  ObjectProperty,
} from "jscodeshift"

export function getProperty(
  object: ObjectExpression | ObjectPattern,
  key: string
) {
  const found = (object.properties as any[]).find(prop => {
    if (ObjectProperty.check(prop)) {
      const k = prop.key
      return Identifier.check(k) && k.name === key
    }
    return false
  })
  return found as ObjectProperty | null
}
