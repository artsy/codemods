import { GraphQLObjectType, GraphQLFloat, GraphQLString } from "graphql"

const IDFields = {}

export const TypeWithThunk = new GraphQLObjectType<any, any>({
  name: "TypeWithThunk",
  fields: () => ({
    ...IDFields,
    channel_id: {
      type: GraphQLString,
    },
    image_url: {
      type: GraphQLString,
    },
    cents_usd: {
      type: GraphQLFloat,
      resolve: ({ price_realized_cents_usd }) => price_realized_cents_usd,
    },
    time_in_utc: {
      type: GraphQLString,
    },
    message_description_md: {
      type: GraphQLString,
    },
    href: {
      type: GraphQLString,
      resolve: ({ slug }) => `/article/${slug}`,
    },
  }),
})
