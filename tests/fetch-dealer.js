const AutoTraderScraper = require('../autoscraper.js')

async function init() {
  let a = new AutoTraderScraper()
  await a.get.dealer.from('https://www.autotrader.co.uk/dealers/hampshire/southampton/southampton-van-centre-10009006?channel=vans')
  .then(dealer => dealer.literals)
  .then(literals => console.log(literals))
  await a.exit()
}

init()
