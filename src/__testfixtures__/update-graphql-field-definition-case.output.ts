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
      args: pageable({
        artworkID: {
          type: GraphQLString,
        },
        other: {
          type: GraphQLString,
        },
      }),
      resolve: (
        _source,
        {
          artworkID,
          ..._options
        },
        { artworkLoader }
      ) => {
        const options: any = {
          artwork_id: artworkID,
          ..._options
        };

        return artworkLoader(options.artwork_id, { other: options.other });
      },
    },
  },
})

const argsMap: GraphQLFieldConfigArgumentMap = {
  otherID: {
    type: GraphQLString,
  },
}

export const FieldConfigWithObjectPatternArgs: GraphQLFieldConfig<any, any> = {
  type: GraphQLString,
  args: {
    artworkID: {
      type: GraphQLString,
    },
    ...argsMap,
  },
  resolve: (
    _source,
    { artworkID: artwork_id, otherID: some_other },
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
  artistID: {
    description: "The gravity ID for an Artist",
    type: GraphQLString,
  }
}/*
{
  const {
    artistID
  } = newFields;

  const oldFields = {
    artistID: artist_id
  };
}
*/

export const MutationWithSingleArg: MutationConfig = {
  name: "MutationWithSingleArg",
  inputFields: {
    id: {
      type: GraphQLString,
    },

    authenticityCertificate: {
      type: GraphQLBoolean,
    },

    ...inputFields
  }/*
  {
    const {
      authenticityCertificate,
      ..._newFields
    } = newFields;

    const oldFields = {
      authenticityCertificate: authenticity_certificate,
      ..._newFields
    };
  }
  */,
  outputFields: {
    consignmentSubmission: {
      type: GraphQLString,

      resolve: (
        {
          consignment_submission
        }
      ) => consignment_submission
    },
  },
  mutateAndGetPayload: (
    {
      authenticityCertificate,
      ..._submission
    },
    { submissionUpdateLoader }
  ) => {
    const submission: any = {
      authenticity_certificate: authenticityCertificate,
      ..._submission
    };

    return submissionUpdateLoader(submission.id, submission);
  },
}

const CustomInputType = new GraphQLInputObjectType({
  name: "CustomInputType",
  fields: () => ({
    someNestedField: {
      type: GraphQLString,
    }
  }/*
  {
    const {
      someNestedField
    } = newFields;

    const oldFields = {
      someNestedField: some_nested_field
    };
  }
  */),
})

export const MutationWithObjectPatternArg = mutationWithClientMutationId({
  name: "MutationWithObjectPatternArg",
  inputFields: {
    foo: {
      type: CustomInputType,
    },

    artistID: {
      description: "The gravity ID for an Artist",
      type: GraphQLString,
    }
  }/*
  {
    const {
      artistID,
      ..._newFields
    } = newFields;

    const oldFields = {
      artistID: artist_id,
      ..._newFields
    };
  }
  */,
  outputFields: {
    consignmentSubmission: {
      type: GraphQLString,

      resolve: (
        {
          consignment_submission
        }
      ) => consignment_submission
    },
  },
  mutateAndGetPayload: ({ foo, artistID: artist_id }, { submissionUpdateLoader }) => {
    return submissionUpdateLoader(foo, { artist_id })
  },
})
