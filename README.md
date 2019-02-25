# AutoTrader Scraper
Scraper for the online vehicle marketplace, [AutoTrader (UK)](https://www.autotrader.co.uk/). Built with Node and makes _**heavy**_ use of [Nightmare.js](https://github.com/segmentio/nightmare) for browser automation.

⚠️ While run headlessly, Nightmare.js uses Electron to automate a browser window. This requires all of Electron's dependencies to be met which includes various UI focused packages. This may be an issue on various server distros.
## Features
- Perform flexible searches using all site-available criteria
- Retrieve all significant data from adverts
- Login to an AutoTrader UK account to access saved adverts
- Retrieve Dealer data and their stock
- Supports cars, vans and bikes
## Installation
Install [AutoTrader Scraper](https://www.npmjs.com/package/autotrader-scraper) via npm by doing the following:
````
npm i autotrader-scraper --save
````
````Javascript
// yourscript.js
const AutoTraderScraper = require('autotrader-scraper')
````
Don't have node/npm installed? Get it [here](https://nodejs.org/en/)
## Usage & Examples
Create an AutoTraderScraper object to begin:
````Javascript
const autotrader = new AutoTraderScraper()
````
### Searching
Perform a search and retrieve the results via the following:
````Javascript
const criteria = {
    // required
    location: {
      radius: 1500,
      postcode: "BH317LE"
    },
    // optional
    make: 'ford',
    condition: ['New', 'Nearly New', 'Used'],
    pageNumber: '1'
}
const results = await autotrader.search('cars').for(criteria)
    .then(listings => listings.literals)
    // or use listings.json to return as a JSON string
````
A large amount of criterias are supported and will be detailed at the end.
### Retrieving Adverts
Retrieve data from an advert URL. These URLs can be retrieved from search result objects via the `url` property or provided by yourself.
````Javascript
const advertURL = 'https://autotrader.co.uk/classified/advert/201810101381913'
const result = await autotrader.get.advert.from(advertURL)
    .then(advert => advert.literal)
    // or use advert.json to return as a JSON string
// As this method requires the use of Nightmare to execute on-site Javascript,
// we must close the Nightmare instance once we're done with it
await autotrader.exit()
````
To be efficient, you should retrieve all desired adverts before closing the Nightmare instance to avoid having to initialise a new instance every time.
### Retrieving Dealers
Retrieve data from a dealer URL.
````Javascript
const dealerURL = 'https://www.autotrader.co.uk/dealers/hampshire/southampton/southampton-van-centre-10009006'
await autotrader.get.dealer.from(dealerURL)
    .then(dealer => dealer.literals)
    // or use dealer.json to return as a JSON string
// As this method requires the use of Nightmare to execute on-site Javascript,
// we must close the Nightmare instance once we're done with it
await autotrader.exit()
````
To be efficient, you should retrieve all desired adverts before closing the Nightmare instance to avoid having to initialise a new instance every time.
#### Account Access
Login to an AutoTrader UK account to use account related features. Currently, this is just the saving and retrieval of saved adverts.
These methods require a Nightmare instance. Remember to exit this instance when you're done with it via the `exit` method. Once the instance has been exited, you must login again to use any account related features.
````Javascript
const credentials = {
    email: 'example@example.com',
    password: 'hunter2'
}
await autotrader.login(credentials)
````
You can easily log back out of this account via the following:
````Javascript
await autotrader.logout()
// Close the Nightmare instance if we're done with it
await autotrader.exit()
````
#### Saved Adverts
When logged in to an AutoTrader UK account, you can save adverts to add them to your account's 'Saved Adverts' list.
````Javascript
const advertURL = 'https://autotrader.co.uk/classified/advert/201810101381913'
await autotrader.save(advertURL)
````
You can also remove (unsave) an advert from your account's 'Saved Adverts' list.
````Javascript
const advertURL = 'https://autotrader.co.uk/classified/advert/201810101381913'
await autotrader.unsave(advertURL)
````
Retrieve your account's saved adverts via the following:
````Javascript
Not currently available
````
These methods require a Nightmare instance so remember to close it once you're done with it via the `exit` method.
