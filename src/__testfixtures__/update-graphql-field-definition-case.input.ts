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

export const TypeWithoutThunk = new GraphQLObjectType<any, any>({
  name: "TypeWithThunk",
  fields: {
    field_with_args_captured_in_single_param: {
      type: GraphQLString,
      args: {
        artwork_id: {
          type: GraphQLString,
        },
        other: {
          type: GraphQLString,
        },
      },
      resolve: (_source, options, { artworkLoader }) => {
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
    artwork_id: {
      type: GraphQLString,
    },
    other_id: {
      type: GraphQLString,
    },
  },
  resolve: (_source, { artwork_id, other_id: some_other }, { artworkLoader }) => {
    return artworkLoader(artwork_id, { some_other })
  },
}
