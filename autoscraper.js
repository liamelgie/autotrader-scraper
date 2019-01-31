const Nightmare = require('nightmare')
const nightmare = Nightmare({ show: false,  pollInterval: 20, width: 1400 })
const cheerio = require('cheerio')
const fetch = require('node-fetch')

class AutoTraderScraper {
  constructor() {

  }

  async search(criteria) {
    let radiusParam = criteria.location.radius ? `radius=${criteria.location.radius}` : ''
    let postcodeParam = criteria.location.postcode ? `&postcode=${postcode}` : ''
    let conditionParam = criteria.condition ? `&onesearchad=${criteria.condition}` : ''
    let minPriceParam = criteria.price.min ? `&price-from=${criteria.price.min}` : ''
    let maxPriceParam = criteria.price.max ? `&price-to=${criteria.price.max}` : ''
    let makeParam = criteria.make ? `&make=${encodeURIComponent(criteria.make.toUpperCase())}` : ''
    let modelParam = criteria.model ? `&model=${encodeURIComponent(criteria.model.toUpperCase())}` : ''
    let variantParam = criteria.variant ? `&aggregatedTrim=${encodeURIComponent(criteria.variant)}` : ''
    let pageParam = criteria.pageNumber ? `&page=${criteria.pageNumber}` : ''
    let url = `https://www.autotrader.co.uk/car-search?${radiusParam}${postcodeParam}${conditionParam}${makeParam}${modelParam}${variantParam}${minPriceParam}${maxPriceParam}${pageParam}`
    let listings = await this.fetchListings(url)
    return listings
  }

  async fetchListings(url) {
    let content = await fetch(url)
      .then(res => res.text())
      .then((body) => {
        return body
      })
    if (!content) return false
    const $ = cheerio.load(content)
    const numOfListings = $('h1.search-form__count').text().replace(/,/g, '').match(/^[0-9]+/)[0]
    let listings = $('li.search-page__result').map((i, el) => {
      return new Listing(el).get()
    }).get()
    return listings
  }

  async fetchAdvert(url) {
    const condition = (/https:\/\/www.autotrader.co.uk\/classified\/advert\/new\/[0-9]+/.test(url)) ? 'New' : 'Used'
    if (condition === 'Used') {
      // TODO: Allow the user to specify data to ignore to speed up retrieval times by removing waits
      // TODO: Impliment a method of detecting whether certain information exists before waiting for it (i.e. seller information)
      let content = await nightmare
        .goto(url)
        .wait('div.fpa__wrapper')
        // .wait('#about-seller > p > button')
        .wait('div.review-links')
        .click('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.fpa__overview > p > button')
        // .click('#about-seller > p > button')
        .evaluate(function() {
          return document.body.innerHTML
        }).end()
      const $ = cheerio.load(content)
      let advert = new Advert($('article.fpa').find('div.fpa__wrapper').html(), condition)
      return advert.get()
    } else {
      let content = await nightmare
      .goto(url)
      .wait('.non-fpa-stock-page')
      .wait('.dealer-details--full')
      .evaluate(function() {
        return document.body.innerHTML
      }).end()
      const $ = cheerio.load(content)
      let advert = new Advert($('div.non-fpa-stock-page').find('section.main-page').html(), condition)
      return advert.get()
    }
  }
}

class Advert {
  constructor(node, condition) {
    if (!node) return null
    this.$ = cheerio.load(node)
    this.condition = condition
    if (condition === 'Used') {
      this.title = this.$('.advert-heading__title').text()
      this.price = this.$('.advert-price__cash-price').text()
      this.description = this.$('.fpa__description').text()
      this.rating = {
        owner: this.$('section.stars__owner-rating--small').next('span.review-links__rating').text(),
        autotrader: this.$('section.stars__expert-rating--small').next('span.review-links__rating').text()
      }
      this.keySpecs = this.$('.key-specifications').find('li').map((i, el) => {
        return this.$(el).text().replace(/\n/g, '').trim()
      }).get()
      // TODO: Add retrieval of the 'details' section of the ad
      this.seller = {
        name: this.$('.seller-name__link').first().text(),
        location: this.$('.seller-locations__town').text(),
        number: this.$('.seller-numbers').text(),
        rating: this.$('.review-links__rating').first().text(),
        description: this.$('#about-seller > p').text()
      }
    } else {
      this.title = this.$('div.detailsmm').find('.atc-type-phantom').text()
      this.price = this.$('div.detailsdeal').find('.atc-type-phantom').text()
      this.keySpecs = this.$('.key-specifications').find('li').map((i, el) => {
        return this.$(el).text().replace(/\n/g, '').trim()
      }).get()
      this.standardFeatures = this.$('ul.detail--list').find('li').map((i, el) => {
        return this.$(el).text().replace(/\n/g, '').trim()
      }).get()
      // TODO: Add retrieval of the 'details' section of the ad
      this.review = {
        score: this.$('.review-holder').find('.starRating__number').text(),
        blurb: this.$('.review-holder').find('.atc-type-picanto').text(),
        pros: this.$('.review-holder').find('.pro-list').find('li').map((i, el) => {
          return this.$(el).text().replace(/\n/g, '').trim()
        }).get(),
        cons: this.$('.review-holder').find('.con-list').find('li').map((i, el) => {
          return this.$(el).text().replace(/\n/g, '').trim()
        }).get(),
      }
      this.seller = {
        name: this.$('.dealer-details--full').find('#dealer-name').text(),
        rating: this.$('.dealer-details--full').find('.dealer__overall-rating-score').text(),
        description: this.$('.dealer-details--full').find('.atc-type-picanto').text(),
      }
    }
  }

  get() {
    return this.condition === 'Used' ? {
      title: this.title,
      price: this.price,
      description: this.description,
      rating: this.rating,
      condition: this.condition,
      keySpecs: this.keySpecs,
      seller: this.seller
    } : {
      title: this.title,
      price: this.price,
      condition: this.condition,
      keySpecs: this.keySpecs,
      standardFeatures: this.standardFeatures,
      review: this.review,
      seller: this.seller
    }
  }

  json() {
    return this.used ? JSON.stringify({
      title: this.title,
      price: this.price,
      description: this.description,
      condition: this.condition,
      keySpecs: this.keySpecs,
      seller: this.seller
    }) : JSON.stringify({
      title: this.title,
      price: this.price,
      keySpecs: this.keySpecs,
      standardFeatures: this.standardFeatures,
      review: this.review,
      seller: this.seller
    })
  }
}

class Listing {
  constructor(node) {
    if (!node) return null
    this.$ = cheerio.load(node)
    this.title = this.$('.listing-title').text()
    this.price = this.$('.vehicle-price').first().text()
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
    this.img = this.$('img').attr('src')
  }

  get() {
    return {
      title: this.title,
      price: this.price,
      keySpecs: this.keySpecs,
      description: this.description,
      location: this.location,
      img: this.img
    }
  }

  json() {
    return JSON.stringify({
      title: this.title,
      price: this.price,
      keySpecs: this.keySpecs,
      description: this.description,
      location: this.location,
      img: this.img
    })
  }
}

module.exports = AutoTraderScraper
