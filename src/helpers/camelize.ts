export function camelize(input: string) {
  if (input.startsWith("__") || !input.includes("_")) {
    return input
  }
  const components = input.split("_")
  return [
    components[0],
    components
      .map(c => {
        switch (c) {
          case "id":
            return "ID"
          case "ids":
            return "IDs"
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
      .slice(1)
      .map(c => c[0].toUpperCase() + c.substring(1))
      .join(""),
  ].join("")
}
