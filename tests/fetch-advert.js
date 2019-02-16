const AutoTraderScraper = require('../autoscraper.js')

async function init() {
  let a = new AutoTraderScraper()
  await a.getAdvert('https://www.autotrader.co.uk/classified/advert/201902084745116?advertising-location=at_cars&sort=sponsored&radius=1500&postcode=b987wy&onesearchad=Used&onesearchad=Nearly%20New&page=1')

  .then(advert => advert.literal)
  .then(literal => console.log(literal))
  await a.exit()
}

init()
