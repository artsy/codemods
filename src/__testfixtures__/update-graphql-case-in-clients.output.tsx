import {
  createFragmentContainer,
  graphql,
  QueryRenderer,
  commitMutation,
} from "react-relay"

const Header = () => null

export default createFragmentContainer(Header, {
  artist: graphql`fragment Header_artist on Artist {
  alternate_names: alternateNames
  biography(tldr: true, maxLength: 42)
  show_metadata_module: hasMetadata
}
`,
})

const BidFlowMaxBidStoryRenderer = () => (
  <QueryRenderer
    environment={null}
    query={graphql`query BidFlowSelectMaxBidRendererQuery($saleArtworkID: String!) {
  sale_artwork: saleArtwork(saleArtworkID: $saleArtworkID) {
    ...SelectMaxBid_sale_artwork
  }
}
`}
  />
)

commitMutation(null, {
  mutation: // TODO: Inputs to the mutation might have changed case of the keys!
  graphql`mutation ArtistListItemFollowArtistMutation($input: FollowArtistInput!) {
  followArtist(input: $input) {
    artist {
      id
      is_followed: isFollowed
    }
  }
}
`,
  variables: {
    input: {
      artist_id: "picasso",
      unfollow: true,
    },
  },
})