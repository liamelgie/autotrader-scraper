const AutoTraderScraper = require('../autoscraper.js')

async function init() {
  let a = new AutoTraderScraper()
  let criteria = {
    location: {
      radius: 1500,
      postcode: "BH317LE"
    },
    condition: ['New', 'Nearly New', 'Used'],
    excludeWriteOffs: false,
    onlyWriteOffs: false,
    customKeywords: '',
    pageNumber: '1'
  }
  await a.search('vans').for(criteria)
  .then(listings => listings.literals)
  .then(literals => console.log(literals))
}
init()
