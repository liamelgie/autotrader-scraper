const AutoTraderScraper = require('../autoscraper.js')

async function init() {
  let a = new AutoTraderScraper()
  console.log(await a.fetchAdvert('https://www.autotrader.co.uk/classified/advert/201901294419300?body-type=SUV&advertising-location=at_cars&postcode=b987wy&onesearchad=New&onesearchad=Nearly%20New&onesearchad=Used&sort=sponsored&radius=1501&page=1'))
}

init()
