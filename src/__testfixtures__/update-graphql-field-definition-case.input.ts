import {
  GraphQLObjectType,
  GraphQLFloat,
  GraphQLString,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLInputFieldConfigMap,
  GraphQLBoolean,
  GraphQLInputObjectType,
} from "graphql"
import { mutationWithClientMutationId, MutationConfig } from "graphql-relay"

const IDFields = {}

// import { pageable } from "relay-cursor-paging"
function pageable(args: GraphQLFieldConfigArgumentMap) {
  return args
}

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
      args: pageable({
        artwork_id: {
          type: GraphQLString,
        },
        other: {
          type: GraphQLString,
        },
      }),
      resolve: (_source, options, { artworkLoader }) =>
        artworkLoader(options.artwork_id, { other: options.other }),
    },
  },
})

const argsMap: GraphQLFieldConfigArgumentMap = {
  other_id: {
    type: GraphQLString,
  },
}

export const FieldConfigWithObjectPatternArgs: GraphQLFieldConfig<any, any> = {
  type: GraphQLString,
  args: {
    artwork_id: {
      type: GraphQLString,
    },
    ...argsMap,
  },
  resolve: (
    _source,
    { artwork_id, other_id: some_other },
    { artworkLoader }
  ) => {
    return artworkLoader(artwork_id, { some_other })
  },
}

export const FieldConfigWithNoArgsToBeRenamed: GraphQLFieldConfig<any, any> = {
  type: GraphQLString,
  args: {
    artworkID: {
      type: GraphQLString,
    },
  },
  resolve: (_source, options, { artworkLoader }) => {
    return artworkLoader(options)
  },
}

const inputFields: GraphQLInputFieldConfigMap = {
  artist_id: {
    description: "The gravity ID for an Artist",
    type: GraphQLString,
  },
}

export const MutationWithSingleArg: MutationConfig = {
  name: "MutationWithSingleArg",
  inputFields: {
    id: {
      type: GraphQLString,
    },
    authenticity_certificate: {
      type: GraphQLBoolean,
    },
    ...inputFields,
  },
  outputFields: {
    consignment_submission: {
      type: GraphQLString,
    },
  },
  mutateAndGetPayload: (submission, { submissionUpdateLoader }) =>
    submissionUpdateLoader(submission.id, submission),
}

const CustomInputType = new GraphQLInputObjectType({
  name: "CustomInputType",
  fields: () => ({
    some_nested_field: {
      type: GraphQLString,
    },
  }),
})

export const MutationWithObjectPatternArg = mutationWithClientMutationId({
  name: "MutationWithObjectPatternArg",
  inputFields: {
    foo: {
      type: CustomInputType,
    },
    artist_id: {
      description: "The gravity ID for an Artist",
      type: GraphQLString,
    },
  },
  outputFields: {
    consignment_submission: {
      type: GraphQLString,
    },
  },
  mutateAndGetPayload: ({ foo, artist_id }, { submissionUpdateLoader }) => {
    return submissionUpdateLoader(foo, { artist_id })
  },
})
