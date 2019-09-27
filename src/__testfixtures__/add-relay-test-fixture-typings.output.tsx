import { RegisterValidTestQueryRawResponse } from "__generated__/RegisterValidTestQuery.graphql";
import { OfferHistoryItemTestQueryRawResponse } from "__generated__/OfferHistoryItemTestQuery.graphql";
import { ArtistListItemTestsQueryRawResponse } from "__generated__/ArtistListItemTestsQuery.graphql";
import { ArtworksPreviewTestsQueryRawResponse } from "__generated__/ArtworksPreviewTestsQuery.graphql";
it("renders properly", async () => {
  const tree = await renderRelayTree({
    Component: ArtworksPreview,
    query: graphql`query ArtworksPreviewTestsQuery @raw_response_type {
  fair(id: "sofa-chicago-2018") {
    ...ArtworksPreview_fair
  }
}
`,
    mockResolvers: {
      Fair: () => fairFixture,
    } as ArtworksPreviewTestsQueryRawResponse,
  })

  expect(tree.html()).toMatchSnapshot()
})

describe("ArtistListItem", () => {
  const render = () =>
    renderRelayTree({
      Component: ({ artist }) => <ArtistListItem artist={artist} />,
      query: graphql`query ArtistListItemTestsQuery @raw_response_type {
  artist(id: "pablo-picasso") {
    ...ArtistListItem_artist
  }
}
`,
      mockData: {
        artist: ArtistFixture,
      } as ArtistListItemTestsQueryRawResponse,
    })

  it("renders properly", async () => {
    const tree = await render()
    expect(tree.html()).toMatchSnapshot()
  })
})

renderRelayTree({
  Component: (props: any) => (
    <OfferHistoryItem {...extraComponentProps} {...props} />
  ),
  mockResolvers: mockResolver({
    ...UntouchedOfferOrder,
    buyer: Buyer,
    lastOffer: OfferWithTotals,
    ...extraOrderProps,
  }) as OfferHistoryItemTestQueryRawResponse,
  query: graphql`query OfferHistoryItemTestQuery @raw_response_type {
  order: commerceOrder(id: "foo") {
    ...OfferHistoryItem_order
  }
}
`,
})

const setupTestEnv = () => {
  return createTestEnv({
    TestPage: RegisterTestPage,
    Component: RegisterRouteFragmentContainer,
    query: graphql`query RegisterValidTestQuery @raw_response_type {
  sale(id: "example-auction-id") {
    ...Register_sale
  }
  me {
    ...Register_me
  }
}
`,
    defaultData: RegisterQueryResponseFixture as RegisterValidTestQueryRawResponse,
    defaultMutationResults: {
      createCreditCard: {},
      createBidder: {},
      updateMyUserProfile: {},
    },
  });
}
