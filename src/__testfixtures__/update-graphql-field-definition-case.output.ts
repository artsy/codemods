import { GraphQLObjectType, GraphQLFloat, GraphQLString } from "graphql"

const IDFields = {}

export const TypeWithThunk = new GraphQLObjectType<any, any>({
  name: "TypeWithThunk",
  fields: () => ({
    ...IDFields,
    channelID: {
      type: GraphQLString,

      resolve: (
        {
          channel_id
        }
      ) => channel_id
    },
    imageURL: {
      type: GraphQLString,

      resolve: (
        {
          image_url
        }
      ) => image_url
    },
    centsUSD: {
      type: GraphQLFloat,
      resolve: ({ price_realized_cents_usd }) => price_realized_cents_usd,
    },
    timeInUTC: {
      type: GraphQLString,

      resolve: (
        {
          time_in_utc
        }
      ) => time_in_utc
    },
    messageDescriptionMD: {
      type: GraphQLString,

      resolve: (
        {
          message_description_md
        }
      ) => message_description_md
    },
    href: {
      type: GraphQLString,
      resolve: ({ slug }) => `/article/${slug}`,
    },
  }),
})
