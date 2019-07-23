import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFieldConfig,
  GraphQLEnumType,
} from "graphql"

const IDFields = {}

export const FieldConfig: GraphQLFieldConfig<any, any> = {
  type: GraphQLString,
  deprecationReason: "What really is a channel, anyways?",
}

export const TypeWithThunk = new GraphQLObjectType<any, any>({
  name: "TypeWithThunk",
  fields: () => ({
    ...IDFields,
    channel_id: {
      type: GraphQLString,
      deprecationReason: "What really is a channel, anyways?",
    },
    sibling_deprecated_field: {
      type: GraphQLString,
      deprecationReason: "Regression test",
    },
    image_url: {
      type: GraphQLString,
    },
    fieldWithVariableReference: FieldConfig,
  }),
})

export const TypeWithoutThunk = new GraphQLObjectType<any, any>({
  name: "TypeWithThunk",
  fields: {
    ...IDFields,
    channel_id: {
      type: GraphQLString,
      deprecationReason: "What really is a channel, anyways?",
    },
    image_url: {
      type: GraphQLString,
    },
    fieldWithVariableReference: FieldConfig,
  },
})

export const ArtworkSorts = new GraphQLEnumType({
  name: "ArtworkSorts",
  values: {
    availability_desc: {
      deprecationReason: "Too lower case",
      value: "-availability",
    },
    AVAILABILITY_DESC: {
      value: "-availability",
    },
  },
})
