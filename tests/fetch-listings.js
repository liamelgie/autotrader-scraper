const AutoTraderScraper = require('../autoscraper.js')

async function init() {
  let a = new AutoTraderScraper()
  console.log(await a.fetchListings('https://www.autotrader.co.uk/car-search?radius=1500&postcode=b987wy&onesearchad=Used&onesearchad=Nearly%20New&onesearchad=New'))
}

init()
