const AutoTraderScraper = require('../autoscraper.js')

async function init() {
  let a = new AutoTraderScraper()
  console.log(await a.fetchAdvert('https://www.autotrader.co.uk/classified/advert/201901294394585?onesearchad=Used&onesearchad=Nearly%20New&onesearchad=New&radius=1500&advertising-location=at_cars&sort=sponsored&postcode=b987wy&page=1'))
}

init()
