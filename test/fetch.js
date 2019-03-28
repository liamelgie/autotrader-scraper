const AutoTraderScraper = require('../autoscraper.js')
const expect = require('chai').expect
const autotrader = new AutoTraderScraper()

describe('Fetch', function() {
  this.timeout(10000)
  describe('adverts', async function() {
    before(async function() {
      // Get a new testing url as adverts are removed regularly
      this.usedCriteria = {
        location: {
          radius: 1500,
          postcode: "BH317LE"
        },
        condition: ['Nearly New', 'Used'],
        excludeWriteOffs: true,
        onlyWriteOffs: false
      }
      this.newCriteria = {
        location: {
          radius: 1500,
          postcode: "BH317LE"
        },
        condition: 'New',
        excludeWriteOffs: true,
        onlyWriteOffs: false
      }
      this.usedResults = await autotrader.search('cars').for({ criteria: this.usedCriteria, results: 13 })
      .then(result => result.literals)
      this.newResults = await autotrader.search('cars').for({ criteria: this.newCriteria, results: 13 })
      .then(result => result.literals)
    })
    it('should return an new car advert\'s metadata', async function() {
      // Retrieve the advert
      const advert = await autotrader.get.advert.from(this.newResults[0].url)
      .then(ad => ad.literal)
      // Test that the data was retrieved correctly
      expect(advert.title).to.be.a('string')
    })
    it('should return an used car advert\'s metadata', async function() {
      // Retrieve the advert
      const advert = await autotrader.get.advert.from(this.usedResults[0].url)
      .then(ad => ad.literal)
      // Test that the data was retrieved correctly
      expect(advert.title).to.be.a('string')
    })
  })
  describe('dealers', async function() {
    it('should return an dealer\'s metadata', async function() {
      // Retrieve the dealer
      const dealer = await autotrader.get.dealer.from('https://www.autotrader.co.uk/dealers/hampshire/southampton/southampton-van-centre-10009006?channel=vans')
      .then(dealer => dealer.literals)
      // Test that the data was retrieved correctly
      expect(dealer.name).to.be.a('string')
    })
  })
  describe('listings', async function() {
    // Retrieve the listings
    it('should return listings from a predefined search url', async function() {
      const results = await autotrader.get.listings.from('https://www.autotrader.co.uk/bike-search?advertising-location=at_bikes&search-target=usedbikes&is-quick-search=true&radius=&make=KAWASAKI&model=&body-type=&cc-from=&cc-to=&postcode=bh317le')
      .then(listings => listings.literals)
      // Test that the data was retrieved correctly
      expect(results).to.have.lengthOf(11)
    })
  })
})
