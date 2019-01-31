const AutoTraderScraper = require('../autoscraper.js')

async function init() {
  let a = new AutoTraderScraper()
  let criteria = {
    location: {
      radius: 1500,
      postcode: "WC1X0HS"
    },
    make: 'FORD',
    model: 'KUGA',
    variant: 'Titanium',
    condition: ['New', 'Nearly New', 'Used'],
    price: {
      min: '1000',
      max: '40000'
    },
    year: {
      min: '2001',
      max: '2018'
    },
    mileage: {
      min: '0',
      max: '200000'
    },
    body: 'SUV',
    fuel: {
      type: 'Diesel',
      consumption: 'OVER_30'
    },
    engine: {
      min: '1.2',
      max: '4.5'
    },
    acceleration: '8_TO_12',
    gearbox: 'Manual',
    drivetrain: 'Front Wheel Drive',
    emissions: 'TO_200',
    doors: '',
    seats: {
      min: '5',
      max: '7'
    },
    insurance: '40U',
    tax: 'TO_295',
    colour: 'Black',
    excludeWriteOffs: false,
    onlyWriteOffs: false,
    customKeywords: '',
    pageNumber: '1'
  }
  console.log(await a.search(criteria))
}
init()
