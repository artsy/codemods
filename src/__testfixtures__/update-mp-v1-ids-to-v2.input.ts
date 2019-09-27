import { createFragmentContainer, graphql } from "react-relay"

const ArtistHeader = () => {}

export const ArtistHeaderFragmentContainer = createFragmentContainer(
  ArtistHeader,
  {
    artist: graphql`
      fragment ArtistTest_artist on Artist {
        id
        _id
        __id
      }
    `,
  }
)
