import {
  GraphQLFieldConfigMap,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
  GraphQLObjectType,
} from "graphql"

export const fields: GraphQLFieldConfigMap<any, any> = {
  artworks: {
    type: new GraphQLObjectType({
      name: "ArtworksConnection",
      fields: {},
    }),
    args: {
      first: {
        type: GraphQLInt,
      },
    },
  },

  articles: {
    type: new GraphQLObjectType({
      name: "ArticlesConnection",
      fields: {},
    }),
    args: {
      first: {
        type: GraphQLInt,
      },
    },
  },

  other: {
    type: new GraphQLList(GraphQLString),
  }
}
