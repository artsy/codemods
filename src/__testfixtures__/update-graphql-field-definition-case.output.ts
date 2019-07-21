import {
  GraphQLObjectType,
  GraphQLFloat,
  GraphQLString,
  GraphQLFieldConfig,
} from "graphql"

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

export const TypeWithoutThunk = new GraphQLObjectType<any, any>({
  name: "TypeWithThunk",
  fields: {
    fieldWithArgsCapturedInSingleParam: {
      type: GraphQLString,
      args: {
        artworkID: {
          type: GraphQLString,
        },
        other: {
          type: GraphQLString,
        },
      },
      resolve: (
        _source,
        {
          artworkID: _artwork_id,
          ..._options
        },
        { artworkLoader }
      ) => {
        const options = {
          artwork_id: _artwork_id,
          ..._options
        };

        return artworkLoader(options.artwork_id, { other: options.other })
      },
    },
  },
})

export const SingleFieldConfigWithObjectPatternArgs: GraphQLFieldConfig<
  any,
  any
> = {
  type: GraphQLString,
  args: {
    artworkID: {
      type: GraphQLString,
    },
    otherID: {
      type: GraphQLString,
    },
  },
  resolve: (_source, { artworkID: artwork_id, otherID: some_other }, { artworkLoader }) => {
    return artworkLoader(artwork_id, { some_other })
  },
}
