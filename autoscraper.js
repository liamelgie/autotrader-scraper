const Nightmare = require('nightmare')
const nightmare = Nightmare({ useragent: 'AutoTraderScraper', pollInterval: 5, width: 1400, typeInterval: 1, waitTimeout: 10000, show: true })
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
      },
      saved: {
        adverts: (options) => this._getSavedAdverts(options)
      },
      all: {
        saved: {
          adverts: () => this._getAllSavedAdverts()
        }
      }
    }
    this.search = (type) => {
      return {
        for: (options) => this._searchFor(type, options)
      }
    }
    this.save = {
      advert: (url) => this._saveAdvert(url)
    }
    this.unsave = {
      advert: (url) => this._unsaveAdvert(url)
    }
  }

  accountFeaturesDisabledMessage() {
    console.error('Account-based features are currently broken due to AutoTrader.co.uk changes')
    console.error('These include: logging in, logging out, saving/unsaving of adverts and the retrieval of saved adverts')
    throw new ATSError('Account Features Disabled')
  }

  async login(credentials) {
    try {
      // Broken account features message
      this.accountFeaturesDisabledMessage()
      if (!credentials) throw new ATSError('Missing Parameter: Account Credentials')
      await nightmare
        .goto('https://www.autotrader.co.uk/secure/signin')
        .wait('input#user-email-sign-in')
        .type('input#user-email-sign-in', credentials.email)
        .type('input#password-sign-in', credentials.password)
        .click('button#sign-in')
        .wait(1500)
        .evaluate(() => {
          if (document.querySelector('input#password-sign-in')) {
            if (document.querySelector('input#password-sign-in').classList.contains('has-error')) return false
          } else {
            return true
          }
        })
        .then((evalResult) => {
          if (!evalResult) {
            throw new ATSError('Account Error: Incorrect Credentials')
          } else {
            nightmare.wait(() => {
              return window.location.href !== 'https://www.autotrader.co.uk/secure/signin'
            })
            this.loggedIn = true
          }
        })
        // TODO: Detect failed login attempt due to invalid credentials
    } catch(e) {
      throw e
    }
  }

  async logout() {
    try {
      // Broken account features message
      this.accountFeaturesDisabledMessage()
      await nightmare
        .goto('https://www.autotrader.co.uk/user/signout')
        .wait(1000)
    } catch(e) {
      throw e
    }
  }

  async exit() {
    await nightmare.end()
    this.loggedIn = false
  }

  async _saveAdvert(url) {
    try {
      if (!url) throw new ATSError('Missing Parameter: Advert URL')
      if (!this.loggedIn) throw new ATSError('Account Error: Not Logged In')
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
    } catch(e) {
      throw e
    }
  }

  async _unsaveAdvert(url) {
    try {
      // Broken account features message
      this.accountFeaturesDisabledMessage()
      if (!url) throw new ATSError('Missing Parameter: Advert URL')
      if (!this.loggedIn) throw new ATSError('Account Error: Not Logged In')
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
    } catch(e) {
      throw e
    }
  }

  // Refactor into something cleaner
  async _getSavedAdverts(options) {
    try {
      // Broken account features message
      this.accountFeaturesDisabledMessage()
      if (!this.loggedIn) throw new ATSError('Account Error: Not Logged In')
      const pageParam = options.page ? `?page=${options.page}` : ''
      const content = await nightmare
        .goto(`https://www.autotrader.co.uk/secure/saved-recent${pageParam}`)
        .wait('#app > main > section > div > div.tabs__tab.tabs__tab--active > section > div > section > ul')
        .evaluate(function() {
          return document.body.innerHTML
        })
        const $ = cheerio.load(content)
        return new SavedAdverts($('ul.saved-advert__results-list').find('li').find('div.saved-advert').map((i, el) => {
          return new SavedAdvert(el)
        }).get())
    } catch(e) {
      throw e
    }
  }

  // Refactor into something cleaner
  async _getSavedAdvertsData(pageNumber) {
    try {
      // Broken account features message
      this.accountFeaturesDisabledMessage()
      if (!this.loggedIn) throw new ATSError('Account Error: Not Logged In')
      const pageParam = pageNumber ? `?page=${pageNumber}` : ''
      const content = await nightmare
        .goto(`https://www.autotrader.co.uk/secure/saved-recent${pageParam}`)
        .wait('#app > main > section > div > div.tabs__tab.tabs__tab--active > section > div > section > ul')
        .evaluate(function() {
          return document.body.innerHTML
        })
        const $ = cheerio.load(content)
        return $('ul.saved-advert__results-list').find('li').find('div.saved-advert')
    } catch(e) {
      throw e
    }
  }

  // Refactor into something cleaner
  async _getAllSavedAdverts() {
    try {
      // Broken account features message
      this.accountFeaturesDisabledMessage()
      if (!this.loggedIn) throw new ATSError('Account Error: Not Logged In')
      const content = await nightmare
        .goto(`https://www.autotrader.co.uk/secure/saved-recent`)
        .wait('#app > main > section > div > div.tabs__tab.tabs__tab--active > section > div > section > ul')
        .evaluate(function() {
          return document.body.innerHTML
        })
      const $ = cheerio.load(content)
      const pageCount = $('.paginator__link--last').attr('href')[$('.paginator__link--last').attr('href').length -1]
      const savedAdverts = new SavedAdverts($('ul.saved-advert__results-list').find('li').find('div.saved-advert').map((i, el) => {
        return new SavedAdvert(el)
      }).get())
      for (let pageNumber = 2; pageNumber <= pageCount; pageNumber++) {
        const savedAdvertsData = await this._getSavedAdvertsData(pageNumber)
        savedAdverts.add(savedAdvertsData.map((i, el) => {
          return new SavedAdvert(el)
        }).get())
      }
      return savedAdverts
    } catch(e) {
      throw e
    }
  }

  async _searchFor(type, options) {
    try {
      if (!type) throw new ATSError('Missing Parameter: Search Type')
      if (!options) throw new ATSError('Missing Parameter: Search Options')
      if (!options.criteria) throw new ATSError('Missing Parameter: Search Criteria')
      const criteria = options.criteria
      delete options.criteria
      const search = new Search({ type, criteria, ...options })
      return await search.execute()
    } catch(e) {
      throw e
    }
  }

  async _getListings(prebuiltURL) {
    try {
      if (!prebuiltURL) throw new ATSError('Missing Parameter: Prebuilt Search URL')
      const search = new Search({ prebuiltURL })
      return await search.execute()
    } catch(e) {
      throw e
    }
  }

  async _getAdvert(url) {
    try {
      if (!url) throw new ATSError('Missing Parameter: Advert URL')
      const condition = (/https:\/\/(www.)?autotrader.co.uk\/classified\/advert\/new\/[0-9]+/.test(url)) ? 'New' : 'Used'
      return condition === 'Used' ? this._getUsedCarAdvert(url) : this._getNewCarAdvert(url)
    } catch(e) {
      throw e
    }
  }

  async _getUsedCarAdvert(url) {
    // TODO: Allow the user to specify data to ignore to speed up retrieval times by removing waits
    try {
      if (!url) throw new ATSError('Missing Parameter: Advert URL')
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
    } catch(e) {
      throw e
    }
  }

  async _getNewCarAdvert(url) {
    try {
      if (!url) throw new ATSError('Missing Parameter: Advert URL')
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
    } catch(e) {
      throw e
    }
  }

  async _getDealer(url) {
    try {
      if (!url) throw new ATSError('Missing Parameter: Dealer URL')
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
    } catch(e) {
      throw e
    }
  }
}

class SavedAdvert {
  constructor(node) {
    try {
      if (!node) throw new ATSError('Missing Parameter: Advert Node')
      this.$ = cheerio.load(node)
      if (!this.$('div.saved-advert').attr('class').includes('saved-advert--expired')) {
        this.baseURL = 'https://autotrader.co.uk' + this.$('.saved-advert__results-title-link').attr('href')
        this.title = this.$('.saved-advert__results-title').text().replace(/\n/g, '').trim()
        this.price = this._cleanPrice(this.$('.saved-advert__results-price').first().text())
        this.image = this.$('.saved-advert__image').length > 0 ? this.$('.saved-advert__image').css('background-image') : null
        this.expired = false
      } else {
        this.baseURL = null
        this.title = this.$('.saved-advert__results-title').text().replace(/\n/g, '').trim()
        this.price = this._cleanPrice(this.$('.saved-advert__results-price').first().text())
        this.image = null
        this.expired = true
      }
    } catch(e) {
      throw e
    }
  }

  _cleanPrice(price) {
    return parseInt(price.replace(/[\D]/g, ''))
  }

  _getCleanURL() {
    try {
      if (this.baseURL === null) return null
      const cleanURL = this.baseURL.match(/^.+advert\/(new\/)?[0-9]+/g)[0]
      if (!cleanURL) throw new ATSError('Invalid Variable: Base Advert URL')
      else return cleanURL
    } catch(e) {
      throw e
    }
  }

  _getCleanImageURL() {
    try {
      if (this.image === null) return null
      const cleanImageURL = this.image.match(/https[^"]+/g)[0]
      if (!cleanImageURL) throw new ATSError('Invalid Variable: Base Advert Image URL')
      return cleanImageURL
    } catch(e) {
      throw e
    }
  }

  get literal() {
    return {
      url: this._getCleanURL(),
      title: this.title,
      price: this.price,
      image: this.image ? this._getCleanImageURL() : null,
      expired: this.expired
    }
  }

  get json() {
    return JSON.stringify({
      url: this._getCleanURL(),
      title: this.title,
      price: this.price,
      image: this.image ? this._getCleanImageURL() : null,
      expired: this.expired
    })
  }
}

class Search {
  constructor(options) {
    try {
      if (!options) throw new ATSError('Missing Parameter: Search Options')
      this.criteria = options.criteria ? options.criteria : {}
      if (options.criteria) {
        this.type = options.type ? options.type.toLowerCase().replace(/s$/, '') : 'car'
        const VALID_TYPES =['car', 'van', 'bike']
        if (!VALID_TYPES.includes(this.type)) throw new ATSError('Invalid Parameter: Search Type')
        if (options.results) this.pagesToGet = this._convertResultsToPages(options.results)
        else if (options.pages) this.pagesToGet = options.pages
      }
      if (options.prebuiltURL) this.prebuiltURL = options.prebuiltURL
    } catch(e) {
      throw e
    }
  }

  _buildSearchURL() {
    try {
      if (!this.criteria.location.postcode) throw new ATSError('Missing Parameter: Location\'s Postcode')
      const radius = this.criteria.location.radius ? new Criteria('radius', this.criteria.location.radius) : null
      const postcode = this.criteria.location.postcode ? new Criteria('postcode', this.criteria.location.postcode) : null
      const condition = this.criteria.condition ? new Criteria('condition', this.criteria.condition) : null
      const minPrice = this.criteria.price ? this.criteria.price.min ? new Criteria('minPrice', this.criteria.price.min) : null : null
      const maxPrice = this.criteria.price ? this.criteria.price.max ? new Criteria('maxPrice', this.criteria.price.max) : null : null
      const make = this.criteria.make ? new Criteria('make', this.criteria.make.toUpperCase()) : null
      const model = this.criteria.model ? new Criteria('model', this.criteria.model.toUpperCase()) : null
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
      throw e
    }
  }

  set criteria(newCriteria) {
    try {
      if (!newCriteria) throw new ATSError('Missing Parameter: Criteria')
      if (this._criteria) {
        const oldCriteria = this._criteria
        this._criteria = Object.assign(oldCriteria, newCriteria)
      } else {
        this._criteria = newCriteria
      }
    } catch(e) {
      throw e
    }
  }

  get criteria() {
    return this._criteria
  }

  get url() {
    return this._buildSearchURL(this.criteria)
  }

  set prebuiltURL(url) {
    try {
      if (!url) throw new ATSError('Missing Parameter: Prebuilt URL')
      if (this._validatePrebuiltURL(url)) this._prebuiltURL = url
      else this._prebuiltURL = false
    } catch(e) {
      throw e
    }

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

  _convertResultsToPages(results) {
    const divided = Math.trunc(results/13)
    const remainder = results % 13
    if (remainder === 0) return divided
    else return divided + 1
  }

  async execute() {
    try {
      const searchURL = this.prebuiltURL ? this.prebuiltURL : this.url
      if (!searchURL) throw new ATSError('Invalid Variable: Search URL')
      this.results = new Listings()
      let resultCount = 0
      if (this.pagesToGet) {
        for (let pageNumber = 1; pageNumber <= this.pagesToGet; pageNumber++) {
          const content = await fetch(searchURL + `&page=${pageNumber}`)
            .then(res => res.text())
            .then((body) => {
              return body
            })
          if (!content) throw new ATSError('Unknown: Couldn\'t Retrieve Results')
          const $ = cheerio.load(content)
          resultCount = $('h1.search-form__count').text().replace(/,/g, '').match(/^[0-9]+/)[0]
          $('li.search-page__result').filter((i, el) => $(el).attr('id')).map((i, el) => {
            this.results.add(new Listing(el))
          }).get()
        }
      } else {
        const content = await fetch(searchURL)
          .then(res => res.text())
          .then((body) => {
            return body
          })
        if (!content) throw new ATSError('Unknown: Couldn\'t Retrieve Results')
        const $ = cheerio.load(content)
        resultCount = $('h1.search-form__count').text().replace(/,/g, '').match(/^[0-9]+/)[0]
        $('li.search-page__result').filter((i, el) => $(el).attr('id')).map((i, el) => {
          this.results.add(new Listing(el))
        }).get()
      }
      return new SearchResult(this.results, resultCount)
    } catch(e) {
      throw e
    }
  }
}

class SearchResult {
  constructor(listings, resultCount) {
    this.listings = listings
    this.date = {
      string: Date().toString(),
      int: Date()
    }
    this.average = {
      price: this.listings.averagePrice,
      mileage: this.listings.averageMileage
    }
    this.resultCount = resultCount
  }

  // Aliases
  get count() {
    return this.resultCount
  }
  get length() {
    return this.resultCount
  }
  get literals() {
    return this.listings.literals
  }
  get json() {
    return this.listings.json
  }
}

class Criteria {
  constructor(type, value) {
    try {
      if (!type) throw new ATSError('Missing Parameter: Criteria Type')
      if (!value) throw new ATSError('Missing Parameter: Criteria Value')
      this.type = type
      this.value = value
    } catch(e) {
      throw e
    }
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
        const VALID_MAKES = ['ABARTH', 'AEON', 'AJP', 'AJS', 'AIXAM', 'ALFA ROMEO', 'APACHE', 'APOLLO', 'APRILIA', 'ARIEL', 'AUDI', 'AUSTIN', 'BEAUFORD', 'BENELLI', 'BENTLEY', 'BETA', 'BIG DOG', 'BIMOTA', 'BMW', 'BROOM TRIKES', 'BRIXTON', 'BROUGH SUPERIOR', 'BSA', 'BUELL', 'BULLIT MOTORCYCLES', 'BULTACO', 'CADILLAC',  'CAGIVA', 'CAN-AM', 'CATERHAM', 'CCM', 'CPI', 'CHEVROLET', 'CHRYSLER', 'CITROEN', 'CUPRA', 'DACIA', 'DAEWOO', 'DAELIM', 'DAF', 'DAIHATSU', 'DAIMLER', 'DERBI', 'DFSK', 'DIRECT BIKE', 'DIRT PRO', 'DODGE', 'DOUGLAS', 'DRESDA', 'DS AUTOMOBILES', 'DUCATI', 'ENERGICA', 'F.B MONDIAL', 'FANTIC', 'FB MONDIAL', 'FERRARI', 'FIAT', 'FORD', 'GAS GAS', 'GENATA', 'GENERIC', 'GHEZZI-BRIAN', 'GILERA', 'GREAT WALL', 'GREEVES', 'GRINNALL', 'HANWAY', 'HARLEY-DAVIDSON', 'HERALD MOTOR CO', 'HESKETH', 'HONDA', 'HUSQVARNA', 'HYOSUNG', 'HYUNDAI', 'INDIAN', 'INFINITI', 'ISUZU', 'JAGUAR', 'JAWA', 'JEEP', 'KAWASAKI', 'KAZUMA', 'KEEWAY', 'KIA', 'KSR MOTO', 'KTM', 'KYMCO', 'LAMBORGINI', 'LAMBRETTA', 'LAND ROVER', 'LAVERDA', 'LDV', 'LEVIS', 'LEXMOTO', 'LEXUS', 'LIFAN', 'LINTEX', 'LML', 'LONGJIA', 'LOTUS', 'M.A.N', 'MAN', 'MAICO', 'MASERATI', 'MASH MOTORCYCLES', 'MATCHLESS',  'MAYBACH', 'MAZDA', 'MCLAREN', 'MERCEDES-BENZ', 'MG', 'MINI', 'MITSUBISHI', 'MONTESA', 'MORGAN', 'MORRIS', 'MORRISON', 'MONTESA', 'MOTO GUZZI', 'MOTO MORINI', 'MOTO PARILLA', 'MOTO-ROMA', 'MOTORINI', 'MUTT', 'MUZ', 'MV AGUSTA', 'MZ', 'NECO', 'NIU', 'NG', 'NISSAN', 'NORTON', 'NSU', 'OPEL', 'OSET', 'OSSA', 'PEUGEOT', 'PIAGGIO', 'PIONEER', 'POLARIS', 'PROTON', 'PULSE', 'QINGQI', 'QUADRO', 'QUADZILLA', 'QUANTUM', 'QUAZZAR', 'RENAULT', 'RIEJU', 'ROLLS-ROYCE', 'ROVER', 'ROYAL ALLOY', 'ROYAL ENFIELD', 'SAAB', 'SACHS', 'SCOMADI', 'SCORPA', 'SEAT', 'SFM', 'SHERCO', 'SIAC', 'SINNIS', 'SKODA', 'SKYTEAM', 'SPY RACING', 'SANTANA', 'SMART', 'SSANGYONG', 'STANDARD', 'STOMP', 'SUBARU', 'SUPERCUB', 'SUZUKI', 'SWM MOTORCYCLES', 'SYM', 'TALBOT', 'TESLA', 'TGB', 'TOMOS', 'TORROT', 'TOYOTA', 'TRIUMPH', 'TVR', 'UM', 'VAUXHALL', 'VELOCIFERO', 'VICTORY', 'VIPER', 'VOLKSWAGEN', 'VOLVO', 'WHITE KNUCKLE', 'WK BIKES', 'YAMAHA', 'ZERO', 'ZHONGYU', 'ZONGSHEN', 'ZONTES', 'ZUNDAPP']
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
    try {
      if (!node) throw 'MissingAdvertNode'
      if (!options || !options.condition || !options.url) {
        if (!options.condition) throw new ATSError('Missing Parameter: Advert Condition')
        if (!options.url) throw new ATSError('Missing Parameter: Advert URL')
      }
      this.$ = cheerio.load(node)
      this.condition = options.condition
      this.baseURL = options.url
      if (this.condition === 'Used') this._getUsedCarData()
      else this._getNewCarData()
    } catch(e) {
      throw e
    }
  }

  _getUsedCarData() {
    try {
      this.title = this.$('.advert-heading__title').text()
      this.price = this._cleanPrice(this.$('.advert-price__cash-price').text())
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
    } catch(e) {
      throw e
    }
  }

  _getNewCarData() {
    try {
      this.title = this.$('div.detailsmm').find('.atc-type-phantom').text()
      this.price = this._cleanPrice(this.$('div.detailsdeal').find('.atc-type-phantom').text())
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
    } catch(e) {
      throw e
    }
  }

  _cleanPrice(price) {
    return parseInt(price.replace(/[\D]/g, ''))
  }

  // TODO: Currently only grabs the first two images as they are pulled from the server once the user clicks through the gallery. Find a way around this.
  _getImages() {
    try {
      return this.condition === 'Used' ?
        this.$('section.gallery').find('ul.gallery__items-list').find('li').map((i, el) => {
          return this.$(el).find('img').attr('src')
        }).get() :
        this.$('.gallery__items-list').find('li').map((i, el) => {
          return this.$(el).find('img').attr('src')
        }).get()
    } catch(e) {
      throw e
    }
  }

  _getTechSpecs() {
    try {
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
    } catch(e) {
      throw e
    }
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
    try {
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
    } catch(e) {
      throw e
    }
  }

  _getSeller() {
    try {
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
    } catch(e) {
      throw e
    }
  }

  _getCleanURL() {
    try {
      const cleanURL = this.baseURL.match(/^.+advert\/(new\/)?[0-9]+/g)[0]
      if (!cleanURL) throw new ATSError('Invalid Variable: Base Advert URL')
      else return cleanURL
    } catch(e) {
      throw e
    }
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
    try {
      if (!node) throw 'MissingListingNode'
      this.$ = cheerio.load(node)
      this.baseURL = 'https://autotrader.co.uk' + this.$('.listing-title').find('a').attr('href')
      this.title = this.$('.listing-title').text().replace(/\n/g, '').trim()
      this.price = this._cleanPrice(this.$('.vehicle-price').first().text())
      this.image = this.$('.listing-main-image').find('img').attr('src')
      if (!/^http/.test(this.image)) this.image = 'https://www.autotrader.co.uk' + this.image
      this.keySpecs = this.$('.listing-key-specs ').find('li').map((i, el) => {
        return this.$(el).text().replace(/\n/g, '').trim()
      }).get()
      if (this.keySpecs.filter(el => el.indexOf('miles') > -1)[0]) {
        this.mileage = this._cleanMileage(this.keySpecs.filter(el => el.indexOf('miles') > -1)[0])
      } else {
        this.mileage = null
      }
      this.description = this.$('.listing-description').text()
      this.location = this.$('.seller-location').text().replace(/\n/g, '').trim()
    } catch(e) {
      throw e
    }
  }

  _cleanMileage(miles) {
    return parseInt(miles.replace(/[\D]/g, ''))
  }

  _cleanPrice(price) {
    return parseInt(price.replace(/[\D]/g, ''))
  }

  _getCleanURL() {
    try {
      const cleanURL = this.baseURL.match(/^.+advert\/(new\/)?[0-9]+/g)[0]
      if (!cleanURL) throw new ATSError('Invalid Variable: Base Advert URL')
      else return cleanURL
    } catch(e) {
      throw e
    }
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

class Collection {
  constructor(entries) {
    this.data = entries ? entries : []
  }

  add(entry) {
    try {
      if (!entry) throw new ATSError('Missing Parameter: New Entry')
      if (Array.isArray(entry)) {
        for (let e of entry) {
          this.data.push(e)
        }
      } else {
        this.data.push(entry)
      }
    } catch(e) {
      throw e
    }
  }

  get averagePrice() {
    let total = 0
    for (let entry of this.data) {
      total += entry.price
    }
    return Math.round(total / this.data.length)
  }

  // TODO: Double check accuracy
  get averageMileage() {
    let total = 0
    for (let entry of this.data) {
      total += entry.mileage
    }
    return Math.round(total / this.data.length)
  }

  get length() {
    return this.data.length
  }

  get literals() {
    return this.data.map((entry) => {
      return entry.literal
    })
  }

  get json() {
    return this.data.map((entry) => {
      return entry.json
    })
  }
}

class Listings extends Collection {
  constructor(listings) {
    super(listings)
  }
}

class SavedAdverts extends Collection {
  constructor(savedAdverts) {
    super(savedAdverts)
  }
}

class Dealer {
  constructor(node, url) {
    try {
      if (!node) throw new ATSError('Missing Parameter: Dealer Node')
      if (!url) throw new ATSError('Missing Parameter: Dealer URL')
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
            price: this._cleanPrice(card.find('.p-card__header-title').text()),
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
    } catch(e) {
      throw e
    }
  }

  _cleanPrice(price) {
    return parseInt(price.replace(/[\D]/g, ''))
  }

  _getCleanURL() {
    try {
      const cleanURL = this.baseURL.match(/^.+advert\/(new\/)?[0-9]+/g)[0]
      if (!cleanURL) throw new ATSError('Invalid Variable: Base Advert URL')
      else return cleanURL
    } catch(e) {
      throw e
    }
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

class ATSError extends Error {
  constructor(...args) {
    super(...args)
    Error.captureStackTrace(this, ATSError)
  }
}

module.exports = AutoTraderScraper
