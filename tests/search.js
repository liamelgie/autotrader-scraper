const AutoTraderScraper = require('../autoscraper.js')

async function init() {
  let a = new AutoTraderScraper()
  let criteria = {
    location: {
      radius: 25,
      location: "WC1X0HS"
    },
    condition: 'Used',
    price: {
      min: '1000',
      max: '10000'
    },
    make: 'NISSAN',
    model: 'Skyline'
  }
  console.log(await a.search(criteria))
}
init()
