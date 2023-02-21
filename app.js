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
    const closedOrders = await kraken.api('ClosedOrders');


    const placeMarketOrderCard = this.homey.flow.getActionCard("place-market-order");
    placeMarketOrderCard.registerRunListener(async (args, state) => {
      this.log('order! ' + JSON.stringify(args));
      
      // the need to calculate order volume
      var ticker = await kraken.api('Ticker', { pair: args.pair.base + args.pair.quote });
      // 10 / +Object.values(ticker.result)[0].c[0] hier ben ik gebleven

      this.log(await kraken.api('AddOrder', { 
        ordertype: 'market', // (req) market, limit, stop-loss, take-profit, stop-loss-limit, take-profit-limit, settle-position
        type: args.type, // (req) buy, sell
        volume: args.volume, // moet worden berekend met actuele prijs bij markt orders
        pair: args.pair.base + args.pair.quote, // gettable?
        price: args.amount,
        validate: Homey.env.TESTMODE
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
            base: e.base,
            quote: e.quote,
            ordermin: e.ordermin
          }
        });

        return resultsMapped.filter((x) => {
          return x.name.toLowerCase().includes(query.toLowerCase());
        });
      }
    );
    
    placeMarketOrderCard.registerArgumentAutocompleteListener("buyin", async (query, args) => {
      // filter based on the query
      let results = [];
      results.push({ 
        name: this.prettyPrintBaseQuote(args.pair.base),
        base: args.pair.base        
       });
      results.push({ 
        name: this.prettyPrintBaseQuote(args.pair.quote),
        quote: args.pair.quote
      });

      return results.filter((x) => {
        return x.name.toLowerCase().includes(query.toLowerCase());
      });
    }
    );
  }

  prettyPrintBaseQuote(item) {
    if ( item.length >= 4 &&
        (item.toUpperCase().startsWith('X') ||
         item.toUpperCase().startsWith('Z')) ){
        return item.substring(1);
    } else {
      return item;
    }
  }

}

module.exports = MyApp;
