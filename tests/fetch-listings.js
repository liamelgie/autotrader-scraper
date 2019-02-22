const AutoTraderScraper = require('../autoscraper.js')

async function init() {
  let a = new AutoTraderScraper()
  await a.get.listings.from('https://www.autotrader.co.uk/bike-search?advertising-location=at_bikes&search-target=usedbikes&is-quick-search=true&radius=&make=KAWASAKI&model=&body-type=&cc-from=&cc-to=&postcode=bh317le')
  .then(listings => listings.literals)
  .then(literals => console.log(literals))

}

init()
