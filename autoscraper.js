const Nightmare = require('nightmare')
const nightmare = Nightmare({ show: false,  pollInterval: 20 })
const cheerio = require('cheerio')
const fetch = require('node-fetch')

class AutoTraderScraper {
  constructor() {

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
    let content = await nightmare
      .goto(url)
      .wait('div.fpa__wrapper')
      .evaluate(function() {
        return document.body.innerHTML
      }).end()
    const $ = cheerio.load(content)
    let fpa = $('article.fpa').find('div.fpa__wrapper')
    console.log(fpa.find('.advert-price__cash-price').text())
    let advert = new Advert($('article.fpa').find('div.fpa__wrapper').html())
    return advert.get()
  }
}

class Advert {
  constructor(node) {
    if (!node) return null
    this.$ = cheerio.load(node)
    this.price = this.$('.advert-price__cash-price').text()
    this.title = this.$('.advert-heading__title').text()
    this.condition = this.$('.advert-heading__condition').text()
    this.sellerName = this.$('.seller-name').text()
    this.sellerLocation = this.$('.seller-locations__town').text()
    this.sellerNumbers = this.$('.seller-numbers').text()
    this.ownerRating = this.$('.review-links__rating').text()
    this.keySpecs = this.$('.key-specifications').find('li').map((i, el) => {
      return this.$(el).text().replace(/\n/g, '').trim()
    }).get()
  }

  get() {
    return this
  }
}

class Listing {
  constructor(node) {
    if (!node) return null
    this.$ = cheerio.load(node)
    this.price = this.$('.vehicle-price').text()
    this.title = this.$('.listing-title').text()
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
      price: this.price,
      title: this.title,
      keySpecs: this.keySpecs,
      description: this.description,
      location: this.location,
      img: this.img
    }
  }

  json() {
    return JSON.stringify({
      price: this.price,
      title: this.title,
      keySpecs: this.keySpecs,
      description: this.description,
      location: this.location,
      img: this.img
    })
  }
}

module.exports = AutoTraderScraper
