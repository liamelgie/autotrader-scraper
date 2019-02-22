const Nightmare = require('nightmare')
const nightmare = Nightmare({ useragent: 'AutoTraderScraper', pollInterval: 5, width: 1400, typeInterval: 1 })
const cheerio = require('cheerio')
const fetch = require('node-fetch')

class AutoTraderScraper {
  constructor() {
    this.loggedIn = false
    // Interface
    this.get = {
      listings: {
        from: (prebuiltURL) => this._getListings(prebuiltURL)
      },
      advert: {
        from: (url) => this._getAdvert(url)
      },
      dealer: {
        from: (url) => this._getDealer(url)
      }
    }
    this.search = (type) => {
      return {
        for: (criteria) => this._searchFor(criteria, type)
      }
    }
    this.save = {
      advert: (url) => this._saveAdvert(url)
    }
    this.unsave = {
      advert: (url) => this._unsaveAdvert(url)
    }
  }

  async login(credentials) {
    try {
      await nightmare
        .goto('https://www.autotrader.co.uk/secure/signin')
        .wait('input#signInSubmit')
        .type('input#signin-email', credentials.email)
        .type('input#signin-password', credentials.password)
        .click('input#signInSubmit')
        .wait('#my-profile-content')
      this.loggedIn = true
        // TODO: Detect failed login attempt due to invalid credentials
    } catch(e) {
      console.error('Could not login due to the following:')
      console.error(e)
      console.error('Exiting...')
      nightmare.end()
      return false
    }
  }

  async logout() {
    try {
      if (await nightmare.exists('#ursSignoutForm > button')) await nightmare.click('#ursSignoutForm > button')
      else throw('Button is not present on the page.')
      await nightmare.wait('.header__sign-in')
      this.loggedIn = false
    } catch(e) {
      console.error('Could not logout due to the following:')
      console.error(e)
      return false
    }
  }

  async exit() {
    await nightmare.end()
    this.loggedIn = false
  }

  async _saveAdvert(url) {
    if (!this.loggedIn) {
      console.error('Could not save advert as no account is logged in.')
      return false
    }
    const saved = await nightmare
      .goto(url)
      .wait('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.advert-interaction-panel.fpa__interaction-panel > button.save-compare-advert.advert-interaction-panel__item.save-compare-advert--has-compare.atc-type-smart.atc-type-smart--medium')
      .evaluate(() => {
        if (document.querySelector('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.advert-interaction-panel.fpa__interaction-panel > button.save-compare-advert.advert-interaction-panel__item.save-compare-advert--has-compare.atc-type-smart.atc-type-smart--medium > span:nth-child(2)').innerHTML === 'Saved') {
          return true
        }
      })
    if (saved) return true
    else await nightmare.click('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.advert-interaction-panel.fpa__interaction-panel > button.save-compare-advert.advert-interaction-panel__item.save-compare-advert--has-compare.atc-type-smart.atc-type-smart--medium').wait(1000)
  }

  async _unsaveAdvert(url) {
    if (!this.loggedIn) {
      console.error('Could not unsave advert as no account is logged in.')
      return false
    }
    const unsaved = await nightmare
      .goto(url)
      .wait('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.advert-interaction-panel.fpa__interaction-panel > button.save-compare-advert.advert-interaction-panel__item.save-compare-advert--has-compare.atc-type-smart.atc-type-smart--medium')
      .evaluate(() => {
        if (document.querySelector('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.advert-interaction-panel.fpa__interaction-panel > button.save-compare-advert.advert-interaction-panel__item.save-compare-advert--has-compare.atc-type-smart.atc-type-smart--medium > span:nth-child(2)').innerHTML === 'Save &amp; compare') {
          return true
        }
      })
    if (unsaved) return true
    else await nightmare.click('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.advert-interaction-panel.fpa__interaction-panel > button.save-compare-advert.advert-interaction-panel__item.save-compare-advert--has-compare.atc-type-smart.atc-type-smart--medium').wait(1000)
  }

  async _searchFor(criteria, type) {
    const search = new Search({ criteria, type })
    const results = await search.execute()
    return results
  }

  async _getListings(prebuiltURL) {
    const search = new Search({ prebuiltURL })
    const results = await search.execute()
    return results
  }

  async _getAdvert(url) {
    const condition = (/https:\/\/www.autotrader.co.uk\/classified\/advert\/new\/[0-9]+/.test(url)) ? 'New' : 'Used'
    return condition === 'Used' ? this._getUsedCarAdvert(url) : this._getNewCarAdvert(url)
  }

  async _getUsedCarAdvert(url) {
    // TODO: Allow the user to specify data to ignore to speed up retrieval times by removing waits
    await nightmare
      .goto(url)
      .wait('div.fpa__wrapper')
    // Seller Information
    if (await nightmare.exists('#about-seller') && await nightmare.exists('#about-seller > p > button')) await nightmare.click('#about-seller > p > button')
    // Review Information
    if (await nightmare.exists('div.review-links')) {
      await nightmare.wait('div.review-links').then(async () => {
        const buttonID = '#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.fpa__overview > p > button'
        if (await nightmare.exists(buttonID)) await nightmare.click(buttonID)
      })
    }
    // Tech Specs/Comes With
    if (await nightmare.exists('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.fpa-details__spec-container')) {
      await nightmare
      .wait('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.fpa-details__spec-container > div > div > div > ul')
      .wait('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.fpa-details__spec-container > section')
    }
    const content = await nightmare.evaluate(function() {
      return document.body.innerHTML
    })
    const $ = cheerio.load(content)
    const advert = new Advert($('article.fpa').find('div.fpa__wrapper').html(), { condition: 'Used', url: url })
    return advert
  }

  async _getNewCarAdvert(url) {
    await nightmare
      .goto(url)
      .wait('.non-fpa-stock-page')
      .wait('.dealer-details--full')
    // AutoTrader Review
    if (await nightmare.exists('.review-holder')) await nightmare.wait('#app > main > div.configurator-light > div:nth-child(1) > section > section > div:nth-child(1) > p')
    // Standard Features
    if (await nightmare.exists('.detailstandard')) await nightmare.wait('#app > main > div.configurator-light > div:nth-child(1) > section > div.detailstandard > div > ul')
    // Tech Specs
    if (await nightmare.exists('#app > main > div.configurator-light > div:nth-child(1) > section > div.tech-specs')) await nightmare.wait('#app > main > div.configurator-light > div:nth-child(1) > section > div.tech-specs > span')
    const content = await nightmare.evaluate(function() {
      return document.body.innerHTML
    })
    const $ = cheerio.load(content)
    const advert = new Advert($('div.non-fpa-stock-page').find('section.main-page').html(), { condition: 'New', url: url })
    return advert
  }

  async _getDealer(url) {
    await nightmare
      .goto(url)
      .wait('#content > header > section > section > section > div:nth-child(3) > div > div > div > p')
      .wait('#content > section')
      .wait('.dealer__stock-reviews')
    const content = await nightmare.evaluate(function() {
      return document.body.innerHTML
    })
    const $ = cheerio.load(content)
    const dealer = new Dealer($('.dealer-profile-page').html(), url)
    return dealer
  }
}

class Search {
  constructor(options) {
    this.criteria = options.criteria ? options.criteria : {}
    if (options.criteria) {
      this.type = options.type ? options.type.toLowerCase().replace(/s$/, '') : 'car'
      const VALID_TYPES =['car', 'van', 'bike']
      if (!VALID_TYPES.includes(this.type)) return false
    }
    this.prebuiltURL = options.prebuiltURL ? options.prebuiltURL : ''
  }

  _buildSearchURL() {
    try {
      if (!this.criteria.location.postcode) throw('Cannot build valid search URL due to missing postcode')
      const radius = this.criteria.location.radius ? new Criteria('radius', this.criteria.location.radius) : null
      const postcode = this.criteria.location.postcode ? new Criteria('postcode', this.criteria.location.postcode) : null
      const condition = this.criteria.condition ? new Criteria('condition', this.criteria.condition) : null
      const minPrice = this.criteria.price ? this.criteria.price.min ? new Criteria('minPrice', this.criteria.price.min) : null : null
      const maxPrice = this.criteria.price ? this.criteria.price.max ? new Criteria('maxPrice', this.criteria.price.max) : null : null
      const make = this.criteria.make ? new Criteria('make', this.criteria.make) : null
      const model = this.criteria.model ? new Criteria('model', this.criteria.model) : null
      const variant = this.criteria.variant ? new Criteria('variant', this.criteria.variant) : null
      const minYear = this.criteria.year ? this.criteria.year.min ? new Criteria('minYear', this.criteria.year.min) : null : null
      const maxYear = this.criteria.year ? this.criteria.year.max ? new Criteria('maxYear', this.criteria.year.max) : null : null
      const minMileage = this.criteria.mileage ? this.criteria.mileage.min ? new Criteria('minMileage', this.criteria.mileage.min) : null : null
      const maxMileage = this.criteria.mileage ? this.criteria.mileage.max ? new Criteria('maxMileage', this.criteria.mileage.max) : null : null
      const wheelbase = this.criteria.wheelbase ? new Criteria('wheelbase', this.criteria.wheelbase) : null
      const cab = this.criteria.cab ? new Criteria('cab', this.criteria.cab) : null
      const minCC = this.criteria.cc ? this.criteria.cc.min ? new Criteria('minCC', this.criteria.cc.min) : null : null
      const maxCC = this.criteria.cc ? this.criteria.cc.max ? new Criteria('maxCC', this.criteria.cc.max) : null : null
      const body = this.criteria.body ? new Criteria('body', this.criteria.body) : null
      const fuelType = this.criteria.fuel ? this.criteria.fuel.type ? new Criteria('fuelType', this.criteria.fuel.type) : null : null
      const fuelConsumption = this.criteria.fuel ? this.criteria.fuel.consumption ? new Criteria('fuelConsumption', this.criteria.fuel.consumption) : null : null
      const minEngineSize = this.criteria.engine ? this.criteria.engine.min ? new Criteria('minEngineSize', this.criteria.engine.min) : null : null
      const maxEngineSize = this.criteria.engine ? this.criteria.engine.max ? new Criteria('maxEngineSize', this.criteria.engine.max) : null : null
      const acceleration = this.criteria.acceleration ? new Criteria('acceleration', this.criteria.acceleration) : null
      const gearbox = this.criteria.gearbox ? new Criteria('gearbox', this.criteria.gearbox) : null
      const drivetrain = this.criteria.drivetrain ? new Criteria('drivetrain', this.criteria.drivetrain) : null
      const emissions = this.criteria.emissions ? new Criteria('emissions', this.criteria.emissions) : null
      const doors = this.criteria.doors ? new Criteria('doors', this.criteria.doors) : null
      const minSeats = this.criteria.seats ? this.criteria.seats.min ? new Criteria('minSeats', this.criteria.seats.min) : null : null
      const maxSeats = this.criteria.seats ? this.criteria.seats.max ? new Criteria('maxSeats', this.criteria.seats.max) : null : null
      const insurance = this.criteria.insurance ? new Criteria('insuranceGroup', this.criteria.insurance) : null
      const annualTax = this.criteria.tax ? new Criteria('annualTax', this.criteria.tax) : null
      const colour = this.criteria.colour ? new Criteria('colour', this.criteria.colour): null
      const excludeWriteOffs = this.criteria.excludeWriteOffs ? new Criteria('excludeWriteOffs', true) : null
      const onlyWriteOffs = this.criteria.onlyWriteOffs ? new Criteria('onlyWriteOffs', true) : null
      const customKeywords = this.criteria.customKeywords ? new Criteria('customKeywords', this.criteria.customKeywords) : null
      const page = this.criteria.pageNumber ? new Criteria('page', this.criteria.pageNumber) : null
      return [`https://www.autotrader.co.uk/${this.type}-search?${radius ? radius.parameter : ''}${postcode ? postcode.parameter : ''}${condition ? condition.parameter : ''}${make ? make.parameter : ''}${model ? model.parameter : ''}`,
        `${variant ? variant.parameter : ''}${minPrice ? minPrice.parameter : ''}${maxPrice ? maxPrice.parameter : ''}${minYear ? minYear.parameter : ''}${maxYear ? maxYear.parameter : ''}`,
        `${minMileage ? minMileage.parameter : ''}${maxMileage ? maxMileage.parameter : ''}${wheelbase ? wheelbase.parameter : ''}${cab ? cab.parameter : ''}${minCC ? minCC.parameter : ''}${maxCC ? maxCC.parameter : ''}${body ? body.parameter : ''}${fuelType ? fuelType.parameter : ''}${fuelConsumption ? fuelConsumption.parameter : ''}`,
        `${minEngineSize ? minEngineSize.parameter : ''}${maxEngineSize ? maxEngineSize.parameter : ''}${acceleration ? acceleration.parameter : ''}${gearbox ? gearbox.parameter : ''}`,
        `${drivetrain ? drivetrain.parameter : ''}${emissions ? emissions.parameter : ''}${doors ? doors.parameter : ''}${minSeats ? minSeats.parameter : ''}${maxSeats ? maxSeats.parameter : ''}`,
        `${insurance ? insurance.parameter : ''}${annualTax ? annualTax.parameter : ''}${colour ? colour.parameter : ''}${excludeWriteOffs ? excludeWriteOffs.parameter : ''}`,
        `${onlyWriteOffs ? onlyWriteOffs.parameter : ''}${customKeywords ? customKeywords.parameter : ''}${page ? page.parameter : ''}`].join('')
    } catch(e) {
      console.error(e)
      return false
    }
  }

  set criteria(newCriteria) {
    if (this._criteria) {
      const oldCriteria = this._criteria
      this._criteria = Object.assign(oldCriteria, newCriteria)
    } else {
      this._criteria = newCriteria
    }
  }

  get criteria() {
    return this._criteria
  }

  get url() {
    return this._buildSearchURL(this.criteria)
  }

  set prebuiltURL(url) {
    if (this._validatePrebuiltURL(url)) this._prebuiltURL = url
    else this._prebuiltURL = false
  }

  get prebuiltURL() {
    return this._prebuiltURL
  }

  _validatePrebuiltURL(prebuiltURL) {
    if (prebuiltURL.includes('https://www.autotrader.co.uk/car-search?') || prebuiltURL.includes('https://www.autotrader.co.uk/van-search?') || prebuiltURL.includes('https://www.autotrader.co.uk/bike-search?')) {
      return true
    } else {
      return false
    }
  }

  async execute() {
    try {
      let searchURL = this.prebuiltURL ? this.prebuiltURL : this.url
      if (!searchURL) throw('Cannot execute search due to invalid search URL')
      const content = await fetch(searchURL)
        .then(res => res.text())
        .then((body) => {
          return body
        })
      if (!content) return false
      const $ = cheerio.load(content)
      const numOfListings = $('h1.search-form__count').text().replace(/,/g, '').match(/^[0-9]+/)[0]
      return new ListingCollection($('li.search-page__result').filter((i, el) => $(el).attr('id')).map((i, el) => {
        return new Listing(el)
      }).get())

    } catch(e) {
      console.error(e)
      return false
    }
  }
}

class Criteria {
  constructor(type, value) {
      if (!type || !value) {
        console.error('Missing Parameter: Criteria object requires both type and value')
        return null
      }
      this.type = type
      this.value = value
  }
  get parameter() {
    switch (this.type) {
      case 'radius':
        return this.validate() ? `radius=${this.value}` : ''
        break
      case 'postcode':
        return `&postcode=${this.value.toLowerCase()}`
        break
      case 'condition':
        if (typeof this.value === 'object') return this.value.map((c) => { return `&onesearchad=${encodeURIComponent(c)}` }).join('')
        else `&onesearchad=${encodeURIComponent(this.value)}`
        break
      case 'minPrice':
        return this.validate() ? `&price-from=${this.value}` : ''
        break
      case 'maxPrice':
        return this.validate() ? `&price-to=${this.value}` : ''
        break
      case 'make':
        return this.validate() ? `&make=${encodeURIComponent(this.value.toUpperCase())}` : ''
        break
      case 'model':
        return `&model=${encodeURIComponent(this.value.toUpperCase())}`
        break
      case 'variant':
        return `&aggregatedTrim=${encodeURIComponent(this.value)}`
        break
      case 'minYear':
        return this.validate() ? `&year-from=${this.value}` : ''
        break
      case 'maxYear':
        return this.validate() ? `&year-to=${this.value}` : ''
        break
      case 'minMileage':
        return this.validate() ? `&minimum-mileage=${this.value}` : ''
        break
      case 'maxMileage':
        return this.validate() ? `&maximum-mileage=${this.value}` : ''
        break
      case 'wheelbase':
        return this.validate() ? `&wheelbase=${encodeURIComponent(this.value)}` : ''
        break
      case 'cab':
        return this.validate() ? `&cab-type=${encodeURIComponent(this.value)}` : ''
        break
      case 'minCC':
        return this.validate() ? `&cc-from=${this.value}` : ''
        break
      case 'maxCC':
        return this.validate() ? `&cc-to=${this.value}` : ''
        break
      case 'body':
        return this.validate() ? `&body-type=${encodeURIComponent(this.value)}` : ''
        break
      case 'fuelType':
        return this.validate() ? `&fuel-type=${this.value}` : ''
        break
      case 'fuelConsumption':
        return this.validate() ? `&fuel-consumption=${this.value}` : ''
        break
      case 'minEngineSize':
        return this.validate() ? `&minimum-badge-engine-size=${this.value}` : ''
        break
      case 'maxEngineSize':
        return this.validate() ? `&maximum-badge-engine-size=${this.value}` : ''
        break
      case 'acceleration':
        return this.validate() ? `&zero-to-60=${this.value}` : ''
        break
      case 'gearbox':
        return this.validate() ? `&transmission=${this.value}` : ''
        break
      case 'drivetrain':
        return this.validate() ? `&drivetrain=${encodeURIComponent(this.value)}` : ''
        break
      case 'emissions':
        return this.validate() ? `&co2-emissions-cars=${this.value}` : ''
        break
      case 'doors':
        return this.validate() ? `&quantity-of-doors=${this.value}` : ''
        break
      case 'minSeats':
        return this.validate() ? `&minimum-seats=${this.value}` : ''
        break
      case 'maxSeats':
        return this.validate() ? `&maximum-seats=${this.value}` : ''
        break
      case 'insuranceGroup':
        return this.validate() ? `&insuranceGroup=${this.value}` : ''
        break
      case 'annualTax':
        return this.validate() ? `&annual-tax-cars=${this.value}` : ''
        break
      case 'colour':
        return this.validate() ? `&colour=${encodeURIComponent(this.value)}` : ''
        break
      case 'excludeWriteOffs':
        return `&exclude-writeoff-categories=on`
        break
      case 'onlyWriteOffs':
        return `&only-writeoff-categories=on`
        break
      case 'customKeywords':
        return `&keywords=${encodeURIComponent(this.value)}`
        break
      case 'page':
        return `&page=${this.value}`
        break
      default:
        return ''
        break
    }
  }
  validate() {
    switch (this.type) {
      case 'radius':
      case 'minPrice':
      case 'maxPrice':
      case 'minYear':
      case 'maxYear':
      case 'minMileage':
      case 'maxMileage':
      case 'page':
        return /[0-9]+/.test(this.value)
        break
      case 'make':
        const VALID_MAKES = ['ABARTH', 'AEON', 'AJP', 'AJS', 'AIXAM', 'ALFA ROMEO', 'APACHE', 'APOLLO', 'APRILIA', 'ARIEL', 'AUDI', 'AUSTIN', 'BEAUFORD', 'BENELLI', 'BENTLEY', 'BETA', 'BIG DOG', 'BIMOTA', 'BMW', 'BROOM TRIKES', 'BRIXTON', 'BROUGH SUPERIOR', 'BSA', 'BUELL', 'BULLIT MOTORCYCLES', 'BULTACO', 'CADILLAC',  'CAGIVA', 'CAN-AM', 'CATERHAM', 'CCM', 'CPI', 'CHEVROLET', 'CHRYSLER', 'CITROEN', 'CUPRA', 'DACIA', 'DAEWOO', 'DAELIM', 'DAF', 'DAIHATSU', 'DAIMLER', 'DERBI', 'DFSK', 'DIRECT BIKE', 'DIRT PRO', 'DODGE', 'DOUGLAS', 'DRESDA', 'DS AUTOMOBILES', 'DUCATI', 'ENERGICA', 'F.B MONDIAL', 'FANTIC', 'FB MONDIAL', 'FERRARI', 'FIAT', 'FORD', 'GAS GAS', 'GENATA', 'GENERIC', 'GHEZZI-BRIAN', 'GILERA', 'GREAT WALL', 'GREEVES', 'GRINNALL', 'HANWAY', 'HARLEY-DAVIDSON', 'HERALD MOTOR CO', 'HESKETH', 'HONDA', 'HUSQVARNA', 'HYOSUNG', 'HYUNDAI', 'INDIAN', 'INFINITI', 'ISUZU', 'JAGUAR', 'JAWA', 'JEEP', 'KAWASAKI', 'KAZUMA', 'KEEWAY', 'KIA', 'KSR MOTO', 'KTM', 'KYMCO', 'LAMBORGINI', 'LAMBRETTA', 'LAND ROVER', 'LAVERDA', 'LDV', 'LEVIS', 'LEXMOTO', 'LEXUS', 'LIFAN', 'LINTEX', 'LML', 'LONGJIA', 'LOTUS', 'M.A.N', 'MAN', 'MAICO', 'MASERATI', 'MASH MOTORCYCLES', 'MATCHLESS',  'MAYBACH', 'MAZDA', 'MCLAREN', 'MERCEDES-BENZ', 'MG', 'MINI', 'MITSUBISHI', 'MONTESA', 'MORGAN', 'MORRIS', 'MORRISON', 'MONTESA', 'MOTO GUZZI', 'MOTO MORINI', 'MOTO PARILLA', 'MOTO-ROMA', 'MOTORINI', 'MUTT', 'MUZ', 'MV AGUSTA', 'MZ', 'NECO', 'NIU', 'NG', 'NISSAN', 'NORTON', 'NSU', 'OPEL', 'OSET', 'OSSA', 'PEUGEOT', 'PIAGGIO', 'PIONEER', 'POLARIS', 'PROTON', 'PULSE', 'QINGQI', 'QUADRO', 'QUADZILLA', 'QUANTUM', 'QUAZZAR', 'RENAULT', 'RIEJU', 'ROLLS-ROYCE', 'ROVER', 'ROYAL ALLOY', 'ROYAL ENFIELD', 'SAAB', 'SACHS', 'SCOMADI', 'SCORPA', 'SEAT', 'SFM', 'SHERCO', 'SIAC', 'SINNIS', 'SKODA', 'SKYTEAM', 'SPY RACING', 'SANTANA', 'SMART', 'SSANGYONG', 'STANDARD', 'STOMP', 'SUBARU', 'SUPERCUB', 'SUZUKI', 'SWM MOTORCYCLES', 'SYM', 'TALBOT', 'TGB', 'TOMOS', 'TORROT', 'TOYOTA', 'TRIUMPH', 'TVR', 'UM', 'VAUXHALL', 'VELOCIFERO', 'VICTORY', 'VIPER', 'VOLKSWAGEN', 'VOLVO', 'WHITE KNUCKLE', 'WK BIKES', 'YAMAHA', 'ZERO', 'ZHONGYU', 'ZONGSHEN', 'ZONTES', 'ZUNDAPP']
        return VALID_MAKES.includes(this.value)
      case 'body':
        const VALID_BODY_TYPES = ['Convertible', 'Coupe', 'Estate', 'Hatchback', 'MPV', 'Other', 'Pickup', 'SUV', 'Box Van', 'Camper', 'Car Derived Van', 'Chassis Cab', 'Combi Van', 'Combi +', 'Crew Cab', 'Curtain Side', 'Dropside', 'Glass Van', 'High Roof Van', 'King Cab', 'Low Loader', 'Luton', 'MPV', 'Medium', 'Minibus', 'Panel Van', 'Platform Cab', 'Specialist Vehicle', 'Temperature Controlled', 'Tipper', 'Vehicle Transporter', 'Window Van', 'Adventure', 'Classic', 'Commuter', 'Custom Cruiser', 'Enduro', 'Minibike', 'Moped', 'Motocrosser', 'Naked', 'Quad/ATV', 'Roadster/Retro', 'Scooter', 'Special', 'Sports Tourer', 'Super Moto', 'Super Sports', 'Supermoto-Road', 'Three Wheeler', 'Tourer', 'Trail (Enduro)', 'Trail Bike', 'Trial Bike', 'Unlisted']
        return VALID_BODY_TYPES.includes(this.value)
        break
      case 'wheelbase':
        const VALID_WHEELBASE_TYPES = ['L', 'LWB', 'M', 'MWB', 'S', 'SWB', '{Wheel base unlisted}']
        return VALID_WHEELBASE_TYPES.includes(this.value)
        break
      case 'cab':
        const VALID_CAB_TYPES = ['Crew cab', 'Day cab', 'Double cab', 'High sleeper cab', 'Low access cab', 'N', 'Short cab', 'Single cab', 'Standard cab', 'Transporter cab', '{Cab type unlisted}']
        return VALID_CAB_TYPES.includes(this.value)
        break
      case 'minCC':
      case 'maxCC':
        const VALID_CCS = ['0', '50', '125', '200', '300', '400', '500', '600', '700', '800', '900', '1000', '1100', '1200', '1300', '1400', '1600', '1800', '2000']
        return VALID_CCS.includes(this.value)
        break
      case 'fuelType':
        const VALID_FUEL_TYPES = ['Bi Fuel', 'Diesel', ' Electric', 'Hybrid - Diesel/Electric', 'Hybrid - Diesel/Electric Plug-in', 'Hybrid - Petrol/Electric', 'Hybrid - Petrol/Electric Plug-in', 'Petrol', 'Petrol Ethanol', 'Unlisted']
        return VALID_FUEL_TYPES.includes(this.value)
        break
      case 'fuelConsumption':
        const VALID_FUEL_CONSUMPTIONS = ['OVER_30', 'OVER_40', 'OVER_50', 'OVER_60']
        return VALID_FUEL_CONSUMPTIONS.includes(this.value)
        break
      case 'minEngineSize':
      case 'maxEngineSize':
        const VALID_ENGINE_SIZES = ['0', '1.0', '1.2', '1.4', '1.6', '1.8', '1.9', '2.0', '2.2', '2.4', '2.6', '3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0']
        return VALID_ENGINE_SIZES.includes(this.value)
        break
      case 'acceleration':
        const VALID_ACCELERATION = ['TO_5', 'TO_8', '8_TO_12', 'OVER_12']
        return VALID_ACCELERATION.includes(this.value)
        break
      case 'gearbox':
        const VALID_GEARBOX = ['Automatic', 'Manual']
        return VALID_GEARBOX.includes(this.value)
        break
      case 'drivetrain':
        const VALID_DRIVETRAIN = ['All Wheel Drive', 'Four Wheel Drive', 'Front Wheel Drive', 'Rear Wheel Drive']
        return VALID_DRIVETRAIN.includes(this.value)
        break
      case 'emissions':
        const VALID_EMISSIONS = ['TO_75', 'TO_100', 'TO_110', 'TO_120', 'TO_130', 'TO_140', 'TO_150', 'TO_165', 'TO_175', 'TO_185', 'TO_200', 'TO_225', 'TO_255', 'OVER_255']
        return VALID_EMISSIONS.includes(this.value)
        break
      case 'doors':
        const VALID_DOORS = ['0', '2', '3', '4', '5', '6']
        return VALID_DOORS.includes(this.value)
        break
      case 'minSeats':
      case 'maxSeats':
        const VALID_SEATS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
        return VALID_SEATS.includes(this.value)
        break
      case 'insuranceGroup':
        const VALID_INSURANCE_GROUPS = ['10U', '20U', '30U', '40U']
        return VALID_INSURANCE_GROUPS.includes(this.value)
        break
      case 'annualTax':
        const VALID_ANNUAL_TAX = ['EQ_0', 'TO_20', 'TO_30', 'TO_110', 'TO_130', 'TO_145', 'TO_185', 'TO_210', 'TO_230', 'TO_270', 'TO_295', 'TO_500', 'OVER_500']
        return VALID_ANNUAL_TAX.includes(this.value)
        break
      case 'colour':
        const VALID_COLOURS = ['Beige', 'Black', 'Blue', 'Bronze', 'Brown', 'Burgundy', 'Gold', 'Green', 'Grey', 'Indigo', 'Magenta', 'Maroon', 'Multicolour', 'Navy', 'Orange', 'Pink', 'Purple', 'Red', 'Silver', 'Turquoise', 'Unlisted', 'White', 'Yellow']
        return VALID_COLOURS.includes(this.value)
        break
    }
  }
}

class Advert {
  constructor(node, options) {
    if (!node) return null
    if (!options || !options.condition || !options.url) return null
    this.$ = cheerio.load(node)
    this.condition = options.condition
    this.baseURL = options.url
    if (this.condition === 'Used') this._getUsedCarData()
    else this._getNewCarData()
  }

  _getUsedCarData() {
    this.title = this.$('.advert-heading__title').text()
    this.price = this.$('.advert-price__cash-price').text()
    this.description = this.$('.fpa__description').text()
    this.images = this._getImages()
    this.rating = {
      owner: this.$('section.stars__owner-rating--small').next('span.review-links__rating').text(),
      autotrader: this.$('section.stars__expert-rating--small').next('span.review-links__rating').text()
    }
    this.keySpecs = this.$('.key-specifications').find('li').map((i, el) => {
      return this.$(el).text().replace(/\n/g, '').trim()
    }).get()
    this.comesWith = this.$('ul.combined-features__features-list').find('li').map((i, el) => {
      return this.$(el).text()
    }).get()
    this.techSpecs = this._getTechSpecs()
    this.seller = this._getSeller()
  }

  _getNewCarData() {
    this.title = this.$('div.detailsmm').find('.atc-type-phantom').text()
    this.price = this.$('div.detailsdeal').find('.atc-type-phantom').text()
    this.images = this._getImages()
    this.keySpecs = this.$('.key-specifications').find('li').map((i, el) => {
      return this.$(el).text().replace(/\n/g, '').trim()
    }).get()
    this.standardFeatures = this.$('ul.detail--list').find('li').map((i, el) => {
      return this.$(el).text().replace(/\n/g, '').trim()
    }).get()
    this.techSpecs = this._getTechSpecs()
    this.review = this._getReview()
    this.seller = this._getSeller()
  }

  // TODO: Currently only grabs the first two images as they are pulled from the server once the user clicks through the gallery. Find a way around this.
  _getImages() {
    return this.condition === 'Used' ?
    this.$('section.gallery').find('ul.gallery__items-list').find('li').map((i, el) => {
      return this.$(el).find('img').attr('src')
    }).get() :
    this.$('.gallery__items-list').find('li').map((i, el) => {
      return this.$(el).find('img').attr('src')
    }).get()
  }

  _getTechSpecs() {
    return this.condition === 'Used' ?
    this._convertTechSpecArraysToObjects(this.$('section.tech-specs').find('div.expander').map((i, el) => {
      const key = this._parseTechSpecKey(this.$(el).find('button.expander__heading').find('span').text())
      const data = this.$(el).find('div.expander__content').find('ul.info-list').find('li')
      const points = data.map((i, el) => {
        if (this.$(el).children().length > 1) return { [this._parseTechSpecKey(this.$(el).find('span.half-one').text())]: this.$(el).find('span.half-two').text() }
        else return this.$(el).text()
      }).get()
      return { [key]: points }
    }).get()) :
    this._convertTechSpecArraysToObjects(this.$('div.tech-specs').find('div.expander').map((i, el) => {
      const key = this._parseTechSpecKey(this.$(el).find('h3.expander__header').text())
      const data = this.$(el).find('div.expander__content').find('ul.info-list').find('li')
      const points = data.map((i, el) => {
        if (this.$(el).children().length > 1) return { [this._parseTechSpecKey(this.$(el).find('span.half-one').text())]: this.$(el).find('span.half-two').text() }
        else return this.$(el).text()
      }).get()
      return { [key]: points }
    }).get())
  }

  _convertTechSpecArraysToObjects(array) {
    const object = Object.assign({}, ...array)
    if (object.economyAndPerformance) object.economyAndPerformance = Object.assign({}, ...object.economyAndPerformance)
    if (object.dimensions) object.dimensions = Object.assign({}, ...object.dimensions)
    return object
  }

  _parseTechSpecKey(key) {
    switch (key) {
      case 'Economy & performance':
        return 'economyAndPerformance'
        break
      case 'Driver Convenience':
        return 'driverConvenience'
        break
      case 'Safety':
        return 'safety'
        break
      case 'Exterior Features':
        return 'exteriorFeatures'
        break
      case 'Interior Features':
        return 'interiorFeatures'
        break
      case 'Technical':
        return 'technical'
        break
      case 'Dimensions':
        return 'dimensions'
        break
      case 'Fuel consumption (urban)':
        return 'fuelConsumptionUrban'
        break
      case 'Fuel consumption (extra urban)':
        return 'fuelConsumptionExtraUrban'
        break
      case 'Fuel consumption (combined)':
        return 'fuelConsumptionCombined'
        break
      case '0 - 60 mph':
        return 'zeroToSixty'
        break
      case 'Top speed':
        return 'topSpeed'
        break
      case 'Cylinders':
        return 'cylinders'
        break
      case 'Valves':
        return 'valves'
        break
      case 'Engine power':
        return 'enginePower'
        break
      case 'Engine torque':
        return 'engineTorque'
        break
      case 'CO₂ emissions':
        return 'CO2Emissions'
        break
      case 'Height':
        return 'height'
        break
      case 'Length':
        return 'length'
        break
      case 'Wheelbase':
        return 'wheelbase'
        break
      case 'Width':
        return 'width'
        break
      case 'Fuel tank capacity':
        return 'fuelTankCapacity'
        break
      case 'Boot space (seats down)':
        return 'bootSpaceSeatsDown'
        break
      case 'Boot space (seats up)':
        return 'bootSpaceSeatsUp'
        break
      case 'Minimum kerb weight':
        return 'minimumKerbWeight'
        break
      case 'Annual tax':
        return 'annualTax'
        break
    }
  }

  _getReview() {
    return this.condition === 'Used' ? null : {
      score: this.$('.review-holder').find('.starRating__number').first().text(),
      blurb: this.$('.review-holder').find('.atc-type-picanto').first().text(),
      pros: this.$('.review-holder').find('.pro-list').find('li').map((i, el) => {
        return this.$(el).text().replace(/\n/g, '').trim()
      }).get(),
      cons: this.$('.review-holder').find('.con-list').find('li').map((i, el) => {
        return this.$(el).text().replace(/\n/g, '').trim()
      }).get()
    }
  }

  _getSeller() {
    return this.condition === 'Used' ? {
      name: this.$('.seller-name__link').first().text(),
      location: this.$('.seller-locations__town').text(),
      number: this.$('.seller-numbers').text(),
      rating: this.$('.review-links__rating').first().text(),
      description: this.$('#about-seller > p').text()
    } : {
      name: this.$('.dealer-details--full').find('#dealer-name').text(),
      rating: this.$('.dealer-details--full').find('.dealer__overall-rating-score').text(),
      description: this.$('.dealer-details--full').find('.atc-type-picanto').text(),
    }
  }

  _getCleanURL() {
    return this.baseURL.match(/^.+advert\/[0-9]+/)[0]
  }

  get literal() {
    return this.condition === 'Used' ? {
      url: this._getCleanURL(),
      title: this.title,
      price: this.price,
      images: this.images,
      description: this.description,
      rating: this.rating,
      condition: this.condition,
      keySpecs: this.keySpecs,
      comesWith: this.comesWith,
      techSpecs: this.techSpecs,
      seller: this.seller
    } : {
      url: this._getCleanURL(),
      title: this.title,
      price: this.price,
      images: this.images,
      condition: this.condition,
      keySpecs: this.keySpecs,
      standardFeatures: this.standardFeatures,
      techSpecs: this.techSpecs,
      review: this.review,
      seller: this.seller
    }
  }

  get json() {
    return this.used ? JSON.stringify({
      url: this._getCleanURL(),
      title: this.title,
      price: this.price,
      images: this.images,
      description: this.description,
      condition: this.condition,
      keySpecs: this.keySpecs,
      comesWith: this.comesWith,
      techSpecs: this.techSpecs,
      seller: this.seller
    }) : JSON.stringify({
      url: this._getCleanURL(),
      title: this.title,
      price: this.price,
      images: this.images,
      keySpecs: this.keySpecs,
      standardFeatures: this.standardFeatures,
      techSpecs: this.techSpecs,
      review: this.review,
      seller: this.seller
    })
  }
}

class Listing {
  constructor(node) {
    if (!node) return null
    this.$ = cheerio.load(node)
    this.baseURL = 'https://autotrader.co.uk' + this.$('.listing-title').find('a').attr('href')
    this.title = this.$('.listing-title').text().replace(/\n/g, '').trim()
    this.price = this.$('.vehicle-price').first().text()
    this.image = this.$('.listing-main-image').find('img').attr('src')
    /* FIX: the following cannot be used as the data provided by users is unpredictable. This must be addressed.
     * this.year = this.$('.listing-key-specs ').find('li').first().text()
     * this.body = this.$('.listing-key-specs ').find('li').first().next().text()
     * etc, etc
     *
     * The following is a working alternative but does not allow for named referencing of each spec.
     *
     */
    this.keySpecs = this.$('.listing-key-specs ').find('li').map((i, el) => {
      return this.$(el).text().replace(/\n/g, '').trim()
    }).get()
    this.description = this.$('.listing-description').text()
    this.location = this.$('.seller-location').text().replace(/\n/g, '').trim()
  }

  _getCleanURL() {
    return this.baseURL.match(/^.+advert\/[0-9]+/g)[0]
  }

  get literal() {
    return {
      url: this._getCleanURL(),
      title: this.title,
      price: this.price,
      image: this.image,
      keySpecs: this.keySpecs,
      description: this.description,
      location: this.location
    }
  }

  get json() {
    return JSON.stringify({
      url: this._getCleanURL(),
      title: this.title,
      price: this.price,
      image: this.image,
      keySpecs: this.keySpecs,
      description: this.description,
      location: this.location
    })
  }
}

class ListingCollection {
  constructor(listings) {
    this.listings = listings ? listings : []
  }

  get literals() {
    return this.listings.map((listing) => {
      return listing.literal
    })
  }

  get json() {
    return this.listings.map((listing) => {
      return listing.json
    })
  }
}

class Dealer {
  constructor(node, url) {
    if (!node) return null
    this.$ = cheerio.load(node)
    this.baseURL = url
    this.name = this.$('.dealer__title').text()
    this.logo = this.$('.dealer__logo').attr('src')
    this.description = this.$('.dealer__profile-body').text()
    this.telephone = this.$('.dealer-profile-telephone-number-container').find('a').map((i, el) => {
      return this.$(el).text().replace(/\n/g, '').trim()
    }).get()
    this.website = this.$('.contact-card__link').attr('href')
    this.location = {
      address: this.$('.contact-card__cta').find('address').text(),
      maps: this.$('.contact-card__cta').attr('href')
    }
    this.stock = this.$('.dealer__stock-reviews').find('.dealer__stock-strip').map((i, el) => {
      const title = this.$(el).find('.dealer__stock-title').text()
      const link = this.$(el).find('.dealer__stock-header').find('a').attr('href')
      const vehicles = this.$(el).find('.grid-results__list').find('li').map((i, el) => {
        const card = this.$(el).find('.p-card')
        return {
          link: card.find('a').attr('href'),
          image: card.find('.p-card__image-mask').find('img').attr('src'),
          price: card.find('.p-card__header-title').text(),
          title: card.find('.p-card__section').find('p-card__sub-title').text(),
          description: card.find('.p-card__desc').text()
        }
      }).get()
      return {
        title,
        link,
        vehicles
      }
    }).get()
  }

  _getCleanURL() {
    return this.baseURL.replace(/\?.+$/, '')
  }

  get literals() {
    return {
      url: this._getCleanURL(),
      name: this.name,
      logo: this.logo,
      description: this.description,
      telephone: this.telephone,
      website: this.website,
      location: this.location,
      stock: this.stock
    }
  }

  get json() {
    return JSON.stringify({
      url: this._getCleanURL(),
      name: this.name,
      logo: this.logo,
      description: this.description,
      telephone: this.telephone,
      website: this.website,
      location: this.location,
      stock: this.stock
    })
  }
}

module.exports = AutoTraderScraper
