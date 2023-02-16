'use strict';

require('inspector').open(9231, '0.0.0.0')

const Homey = require('homey');
const KrakenClient = require('kraken-api');

class MyApp extends Homey.App {
  async onInit() {
    this.log('MyApp has been initialized');

    const key          = Homey.env.API_KEY;
    const secret       = Homey.env.API_SECRET;
    const kraken       = new KrakenClient(key, secret);

    const assetPairs = await kraken.api('AssetPairs');

    const placeMarketOrderCard = this.homey.flow.getActionCard("place-market-order");
    placeMarketOrderCard.registerRunListener(async (args, state) => {
      this.log('order! ' + JSON.stringify(args));
      // the need to calculate order volume
      var ticker = await kraken.api('Ticker', { pair: args.pair.pair });
      // 10 / +Object.values(ticker.result)[0].c[0] hier ben ik gebleven


      this.log(await kraken.api('AddOrder', { 
        ordertype: 'markeddt', // (req) market, limit, stop-loss, take-profit, stop-loss-limit, take-profit-limit, settle-position
        type: 'buy', // (req) buy, sell
        volume: '1', // moet worden berekend met actuele prijs bij markt orders
        pair: args.pair.pair, // gettable?
        price: args.amount
        //userref: 159753,
        //expiretm: '1676565876' // expires in
      }));

    });
    placeMarketOrderCard.registerArgumentAutocompleteListener("pair", async (query, args) => {
        // filter based on the query
        let results = Object.values(assetPairs.result);
        let resultsMapped = results.map((e) => {
          return {
            name: e.wsname,
            pair: e.base + e.quote,
            ordermin: e.ordermin
          }
        });

        return resultsMapped.filter((x) => {
          return x.name.toLowerCase().includes(query.toLowerCase());
        });
      }
    );
  }
}

module.exports = MyApp;
