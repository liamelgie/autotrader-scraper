const AutoTraderScraper = require('../autoscraper.js')

async function init() {
  let a = new AutoTraderScraper()
  await a.get.advert.from('https://autotrader.co.uk/classified/advert/201810101381913')
  .then(advert => advert.literal)
  .then(literal => console.log(literal))
  await a.exit()
}

init()
