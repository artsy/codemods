import {
  createFragmentContainer,
  graphql,
  QueryRenderer,
  commitMutation,
} from "react-relay"

const Header = () => null

export default createFragmentContainer(Header, {
  artist: graphql`
    fragment Header_artist on Artist {
      alternate_names
      biography(tldr: true, max_length: 42)
      show_metadata_module: has_metadata
    }
  `,
})

const BidFlowMaxBidStoryRenderer = () => (
  <QueryRenderer
    environment={null}
    query={graphql`
      query BidFlowSelectMaxBidRendererQuery($saleArtworkID: String!) {
        sale_artwork(sale_artwork_id: $saleArtworkID) {
          ...SelectMaxBid_sale_artwork
        }
      }
    `}
  />
)

commitMutation(null, {
  mutation: graphql`
    mutation ArtistListItemFollowArtistMutation($input: FollowArtistInput!) {
      followArtist(input: $input) {
        artist {
          id
          is_followed
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
