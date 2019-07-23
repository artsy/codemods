import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFieldConfig,
  GraphQLEnumType,
} from "graphql"

const IDFields = {}

export const FieldConfig: GraphQLFieldConfig<any, any> = {}

export const TypeWithThunk = new GraphQLObjectType<any, any>({
  name: "TypeWithThunk",
  fields: () => ({
    ...IDFields,

    image_url: {
      type: GraphQLString,
    },

    fieldWithVariableReference: FieldConfig
  }),
})

export const TypeWithoutThunk = new GraphQLObjectType<any, any>({
  name: "TypeWithThunk",
  fields: {
    ...IDFields,

    image_url: {
      type: GraphQLString,
    },

    fieldWithVariableReference: FieldConfig
  },
})

export const ArtworkSorts = new GraphQLEnumType({
  name: "ArtworkSorts",
  values: {
    AVAILABILITY_DESC: {
      value: "-availability",
    }
  },
})
