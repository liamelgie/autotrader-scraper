# AutoTrader Scraper
Scraper for the online vehicle marketplace, [AutoTrader (UK)](https://www.autotrader.co.uk/). Built with Node and makes _**heavy**_ use of [Nightmare.js](https://github.com/segmentio/nightmare) for browser automation.

⚠️ While run headlessly, Nightmare.js uses Electron to automate a browser window. This requires all of Electron's dependencies to be met which includes various UI focused packages. This may be an issue on various server distros.
## Features
- Perform flexible searches using all site-available criteria
- Retrieve all significant data from adverts
-  ~~Login to an AutoTrader UK account to access saved adverts~~
- Retrieve Dealer data and their stock
- Supports cars, vans and bikes

**❌ Due to recent and ongoing AutoTrader.co.uk changes, account features are currently disabled as of the 3rd of March 2019. These features will be reimplemented when new changes stop being made to the site's account system.**
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
    condition: ['New', 'Nearly New', 'Used']
}
const results = await autotrader.search('cars').for({ criteria })
    .then(listings => listings.literals)
    // or use .json to return as a JSON string
````
**NOTE:** A large amount of other criteria are supported and will be detailed at the end.
#### Retrieve a number of results
You can specify an amount of results to get by either specifying the number of pages or number of results you wish to retrieve:
````Javascript
const criteria = { /* define criteria */ }
const results = await autotrader.search('cars').for({ criteria, pages: 2 })
    .then(listings => listings.literals)
    // or use .json to return as a JSON string
````
or
````Javascript
const criteria = { /* define criteria */ }
const results = await autotrader.search('cars').for({ criteria, results: 50 })
    .then(listings => listings.literals)
    // or use .json to return as a JSON string
````
When giving a number of results, they will be converted to pages when parsed by the search object. Each page contains 13 results so the number of results will not be true to the input but rather rounded up to a number divisible by 13.
This means, specifying `results: 50` will be converted to `pages: 4`.
#### Metadata
You can retrieve data about the search via the returned `SearchResult` object.
````Javascript
const criteria = { /* define criteria */ }
const results = await autotrader.search('cars').for({ criteria, results: 50 })
const searchURL = results.url // the url used to perform the search
const averagePrice = results.average.price // average price of retrieved results
const averageMileage = results.average.mileage // average mileage of retrieved results
const dateOfSearch = results.date.string // or as an int
const possibleResults = results.searchResultCount // number of results on AutoTrader.co.uk
const retrievedResults = results.retrievedResultCount // number of results retrieved by the scrape
// the above is an alias for .listings.length and can also be retrieved via .count or .length
````

### Retrieving Adverts
Retrieve data from an advert URL. These URLs can be retrieved from search result objects via the `url` property or provided by yourself.
````Javascript
const advertURL = 'https://autotrader.co.uk/classified/advert/201810101381913'
const result = await autotrader.get.advert.from(advertURL)
    .then(advert => advert.literal)
    // or use .json to return as a JSON string
/* as this method requires the use of Nightmare to execute on-site Javascript,
 * we must close the Nightmare instance once we're done with it */
await autotrader.exit()
````
To be efficient, you should retrieve all desired adverts before closing the Nightmare instance to avoid having to initialise a new instance every time.
### Retrieving Dealers
Retrieve data from a dealer URL.
````Javascript
const dealerURL = 'https://www.autotrader.co.uk/dealers/hampshire/southampton/southampton-van-centre-10009006'
await autotrader.get.dealer.from(dealerURL)
    .then(dealer => dealer.literals)
    // or use .json to return as a JSON string
/* as this method requires the use of Nightmare to execute on-site Javascript,
 * we must close the Nightmare instance once we're done with it */
await autotrader.exit()
````
To be efficient, you should retrieve all desired adverts before closing the Nightmare instance to avoid having to initialise a new instance every time.
### Account Access

> **❌ Due to recent and ongoing AutoTrader.co.uk changes, account features are currently disabled as of the 3rd of March 2019. These features will be reimplemented when new changes stop being made to the
> site's account system.**

Login to an AutoTrader UK account to use account related features. Currently, this is just the saving and retrieval of saved adverts.

**These methods require a Nightmare instance. Remember to exit this instance when you're done with it via the `exit` method. Once the instance has been exited, you must login again to use any account related features.**
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
// then close the Nightmare instance if we're done with it
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
 // get all saved adverts
 const savedAdverts = await autotrader.get.all.saved.adverts()
  .then(results => results.literals)
 // get specific page of saved adverts (e.g. page 1 for most recent)
 const newestSavedAdverts = await autotrader.get.saved.adverts({ page: 1 })
 .then(results => results.literals)
````
⚠️ Remember to exit the Nightmare instance once we're done with it to avoid memory leaks.

### Criteria

| Key |Definition | Validation|
|--|--|--|--|
|`location.radius`|The maximum distance from the given postcode (in miles)|Integers|
|`location.postcode`|The postcode in which to centre the search from|String|
|`condition`|The vehicle's condition|`New`, `Nearly New`, `Used`|
|`price.min`|The minimum price|Integers|
|`price.max`|The maximum price|Integers|
|`make`|The vehicle's make (e.g. Ford, Nissan)|Validated against a list of car makes|
|`model`|The vehicle's model (e.g. Focus, c4)|String|
|`variant`|The vehicle's variant (e.g. ST, EcoBoost)|String|
|`year.min`|The minimum year of manufacture|Integers|
|`year.max`|The maximum year of manufacture|Integers|
|`mileage.min`| The minimum mileage |Integers|
|`mileage.max`| The maximum mileage |Integers|
|`wheelbase`| The vehicle's wheelbase. Vans only|`L`, `M`, `S`, `LWB`, `SWB`, `MWB`, `{Wheel base unlisted}`|
|`cab`|The vehicle's cab type. Vans only|`Crew cab`, `Double cab`, `Day cab`, `High sleeper cab`, `Low access cab`, `N`, `Short cab`, `Standard cab`, `Transported cab`, `Y`, `{Cab type unlisted}`|
|`cc.min`|The minimum CC. Bikes only.|`0`, `50`, `125`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900`, `1000`, `1100`, `1200`, `1300`, `1400`, `1600`, `1800`, `2000`|
|`cc.max`|The maximum CC. Bikes only.|`0`, `50`, `125`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900`, `1000`, `1100`, `1200`, `1300`, `1400`, `1600`, `1800`, `2000`|
|`body`|The vehicle's body type|`Convertible`, `Coupe`, `Estate`, `Hatchback`, `MPV`, `Other`, `Pickup`, `SUV`, `Box Van`, `Camper`, `Car Derived Van`, `Chassis Cab`, `Combi Van`, `Combi +`, `Crew Cab`, `Curtain Side`, `Dropside`, `Glass Van`, `High Roof Van`, `King Cab`, `Low Loader`, `Luton`, `MPV`, `Medium`, `Minibus`, `Panel Van`, `Platform Cab`, `Specialist Vehicle`, `Temperature Controlled`, `Tipper`, `Vehicle Transporter`, `Window Van`, `Adventure`, `Classic`, `Commuter`, `Custom Cruiser`, `Enduro`, `Minibike`, `Moped`, `Motocrosser`, `Naked`, `Quad/ATV`, `Roadster/Retro`, `Scooter`, `Special`, `Sports Tourer`, `Super Moto`, `Super Sports`, `Supermoto-Road`, `Three Wheeler`, `Tourer`, `Trail (Enduro)`, `Trail Bike`, `Trial Bike`, `Unlisted`|
|`fuel.type`|The vehicle's fuel type|`Bi Fuel`, `Diesel`, `  Electric`, `Hybrid - Diesel/Electric`, `Hybrid - Diesel/Electric Plug-in`, `Hybrid - Petrol/Electric`, `Hybrid - Petrol/Electric Plug-in`, `Petrol`, `Petrol Ethanol`, `Unlisted`|
|`fuel.consumption`|The vehicle's average fuel consumption|`OVER_30`,  `OVER_40`,  `OVER_50`,  `OVER_60`|
|`engine.min`|The minimum size of the engine|`0`,  `1.0`,  `1.2`,  `1.4`,  `1.6`,  `1.8`,  `1.9`,  `2.0`,  `2.2`,  `2.4`,  `2.6`,  `3.0`,  `3.5`,  `4.0`,  `4.5`,  `5.0`,  `5.5`,  `6.0`,  `6.5`,  `7.0`|
|`engine.max`|The maximum size of the engine|`0`,  `1.0`,  `1.2`,  `1.4`,  `1.6`,  `1.8`,  `1.9`,  `2.0`,  `2.2`,  `2.4`,  `2.6`,  `3.0`,  `3.5`,  `4.0`,  `4.5`,  `5.0`,  `5.5`,  `6.0`,  `6.5`,  `7.0`|
|`acceleration`|The seconds taken for the vehicle to go from 0 to 60|`TO_5`,  `TO_8`,  `8_TO_12`,  `OVER_12`|
|`gearbox`|The type of vehicle's gearbox |`Automatic`, `Manual`|
|`drivetrain`|The type of the vehicle's drivetrain |`All  Wheel  Drive`,  `Four  Wheel  Drive`,  `Front  Wheel  Drive`,  `Rear  Wheel  Drive`|
|`emissions`|The vehicle's average co2 emissions|`TO_75`,  `TO_100`,  `TO_110`,  `TO_120`,  `TO_130`,  `TO_140`,  `TO_150`,  `TO_165`,  `TO_175`,  `TO_185`,  `TO_200`,  `TO_225`,  `TO_255`,  `OVER_255`|
|`doors`|The vehicle's number of doors|`0`,  `2`,  `3`,  `4`,  `5`,  `6`|
|`seats.min`|The minimum number of seats that the vehicle has|`1`,  `2`,  `3`,  `4`,  `5`,  `6`,  `7`,  `8`,  `9`,  `10`,  `11`,  `12`|
|`seats.max`|The maximum number of seats that the vehicle has|`1`,  `2`,  `3`,  `4`,  `5`,  `6`,  `7`,  `8`,  `9`,  `10`,  `11`,  `12`|
|`insurance`|The vehicle's insurance group|`10U`,  `20U`,  `30U`,  `40U`|
|`tax`|The annual price of the vehicle's tax|`EQ_0`,  `TO_20`,  `TO_30`,  `TO_110`,  `TO_130`,  `TO_145`,  `TO_185`,  `TO_210`,  `TO_230`,  `TO_270`,  `TO_295`,  `TO_500`,  `OVER_500`|
|`colour`|The vehicle's colour|`Beige`, `Black`, `Blue`, `Bronze`, `Brown`, `Burgundy`, `Gold`, `Green`, `Grey`, `Indigo`, `Magenta`, `Maroon`, `Multicolour`, `Navy`, `Orange`, `Pink`, `Purple`, `Red`, `Silver`, `Turquoise`, `Unlisted`, `White`, `Yellow`|
|`excludeWriteOffs`|Boolean to exclude written off vehicles from the results|`true`, `false`|
|`onlyWriteOffs`|Boolean to only include written off vehicles in the results|`true`, `false`|
|`customKeywords`|Keywords that should be used to narrow down the search. Is unpredictable but may be useful if the above criteria do not meet your needs.|String or Array|

#### Things To Note
##### Condition
When defining the `condition` criteria, you can use either a string or array.
An array value allows you to search multiple types of conditions in a single search. For example, the following snippet will retrieve cars in new or nearly new condition.
````Javascript
const criteria = {
    location: {
      radius: 1500,
      postcode: "BH317LE"
    },
    condition: ['New', 'Nearly New']
}
const results = await autotrader.search('cars').for({ criteria })
    .then(listings => listings.literals)
````
##### Custom Keywords
The custom keywords parameter must be sent in a single string but for improved readability, you can define the `customKeywords` criteria as a string or an array.
````Javascript
const criteria = {
    location: {
      radius: 1500,
      postcode: "BH317LE"
    },
    condition: ['New', 'Nearly New', 'Used'],
    customKeywords: ['leather seats', 'air conditioning'] // and
    customKeywords: 'leather seats air conditioning'      // are both functionally the same
}
const results = await autotrader.search('cars').for({ criteria })
    .then(listings => listings.literals)
````
