export function camelize(input: string) {
  const components = input.split("_").map(c => {
    switch (c) {
      case "id":
        return "ID"
      case "url":
        return "URL"
      case "usd":
        return "USD"
      case "utc":
        return "UTC"
      case "md":
        return "MD"
      case "jwt":
        return "JWT"
      default:
        return c
    }
  })
  return [
    components[0],
    components
      .slice(1)
      .map(c => c[0].toUpperCase() + c.substring(1))
      .join(""),
  ].join("")
}
