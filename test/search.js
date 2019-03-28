const AutoTraderScraper = require('../autoscraper.js')
const expect = require('chai').expect
const autotrader = new AutoTraderScraper()

describe('Search', function() {
  this.timeout(10000)
  before(function() {
    // Set the criteria for the searches
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
  })
  describe('cars', function() {
    describe('new', function() {
      it('should retrieve at least 13 cars (one page)' , async function() {
        const results = await autotrader.search('cars').for({ criteria: this.newCriteria, results: 13 })
        .then(result => result.literals)
        // Test that the data was retrieved correctly
        expect(results).to.have.lengthOf(10)
      })
    })
    describe('used', function() {
      it('should retrieve at least 13 cars (one page)' , async function() {
        const results = await autotrader.search('cars').for({ criteria: this.usedCriteria, results: 13 })
        .then(result => result.literals)
        // Test that the data was retrieved correctly
        expect(results).to.have.lengthOf(13)
      })
    })
  })
  describe('bikes', function() {
    describe('new', function() {
      it('should retrieve at least 11 bikes (one page)' , async function() {
        const results = await autotrader.search('bikes').for({ criteria: this.newCriteria, results: 13 })
        .then(result => result.literals)
        // Test that the data was retrieved correctly
        expect(results).to.have.lengthOf(11)
      })
    })
    describe('used', function() {
      it('should retrieve at least 11 bikes (one page)' , async function() {
        const results = await autotrader.search('bikes').for({ criteria: this.usedCriteria, results: 13 })
        .then(result => result.literals)
        // Test that the data was retrieved correctly
        expect(results).to.have.lengthOf(11)
      })
    })
  })
  describe('vans', function() {
    describe('new', function() {
      it('should retrieve at least 13 vans (one page)' , async function() {
        const results = await autotrader.search('vans').for({ criteria: this.newCriteria, results: 13 })
        .then(result => result.literals)
        // Test that the data was retrieved correctly
        expect(results).to.have.lengthOf(10)
      })
    })
    describe('used', function() {
      it('should retrieve at least 13 vans (one page)' , async function() {
        const results = await autotrader.search('vans').for({ criteria: this.usedCriteria, results: 13 })
        .then(result => result.literals)
        // Test that the data was retrieved correctly
        expect(results).to.have.lengthOf(13)
      })
    })
  })
})
