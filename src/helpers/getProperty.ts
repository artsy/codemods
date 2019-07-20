import { Identifier, ObjectExpression, ObjectProperty } from "jscodeshift"

export function getProperty(object: ObjectExpression, key: string) {
  const found = object.properties.find(prop => {
    if (ObjectProperty.check(prop)) {
      const k = prop.key
      return Identifier.check(k) && k.name === key
    }
    return false
  })
  return found as ObjectProperty | null
}
