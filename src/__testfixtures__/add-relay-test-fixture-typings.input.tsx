it("renders properly", async () => {
  const tree = await renderRelayTree({
    Component: ArtworksPreview,
    query: graphql`
      query ArtworksPreviewTestsQuery {
        fair(id: "sofa-chicago-2018") {
          ...ArtworksPreview_fair
        }
      }
    `,
    mockResolvers: {
      Fair: () => fairFixture,
    },
  })

  expect(tree.html()).toMatchSnapshot()
})

describe("ArtistListItem", () => {
  const render = () =>
    renderRelayTree({
      Component: ({ artist }) => <ArtistListItem artist={artist} />,
      query: graphql`
        query ArtistListItemTestsQuery {
          artist(id: "pablo-picasso") {
            ...ArtistListItem_artist
          }
        }
      `,
      mockData: {
        artist: ArtistFixture,
      },
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
  }),
  query: graphql`
    query OfferHistoryItemTestQuery {
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
    query: graphql`
      query RegisterValidTestQuery {
        sale(id: "example-auction-id") {
          ...Register_sale
        }
        me {
          ...Register_me
        }
      }
    `,
    defaultData: RegisterQueryResponseFixture,
    defaultMutationResults: {
      createCreditCard: {},
      createBidder: {},
      updateMyUserProfile: {},
    },
  })
}
