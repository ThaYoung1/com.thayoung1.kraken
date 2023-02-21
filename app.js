'use strict';

require('inspector').open(9231, '0.0.0.0')

const Homey = require('homey');
const KrakenClient = require('kraken-api');

let assetPairs;

class KrakenApp extends Homey.App {
  async onInit() {
    this.log('KrakenApp has been initialized');

    const key          = Homey.env.API_KEY;
    const secret       = Homey.env.API_SECRET;
    const kraken       = new KrakenClient(key, secret);

    assetPairs = await kraken.api('AssetPairs');

    const placeMarketOrderCard = this.homey.flow.getActionCard("place-market-order");
    placeMarketOrderCard.registerArgumentAutocompleteListener("pair", async (query, args) => { return this.autocompletePairs(query, args); });
    placeMarketOrderCard.registerArgumentAutocompleteListener("unit", async (query, args) => { return this.autocompleteUnits(query, args); });

    const placeLimitOrderCard = this.homey.flow.getActionCard("place-limit-order");
    placeLimitOrderCard.registerArgumentAutocompleteListener("pair", async (query, args) => { return this.autocompletePairs(query, args); });
    placeLimitOrderCard.registerArgumentAutocompleteListener("unit", async (query, args) => { return this.autocompleteUnits(query, args); });

    placeMarketOrderCard.registerRunListener(async (args, state) => {
      // the need to calculate order volume
      var volume = args.volume;
      if (args.unit.baseorquote == args.pair.quote){
        var ticker = await kraken.api('Ticker', { pair: args.pair.base + args.pair.quote });
        var arrTicker = Object.values(ticker.result);

        // 10 / +Object.values(ticker.result)[0].c[0] hier ben 
        var volume = args.volume / arrTicker[0].c[0];
        if (volume < args.pair.ordermin) {
          throw new Error('Fout! Minimum niet gehaald');
        }
      }

      var result = await kraken.api('AddOrder', { 
        ordertype: 'market', // (req) market, limit, stop-loss, take-profit, stop-loss-limit, take-profit-limit, settle-position
        type: args.type, // (req) buy, sell
        volume: volume, // moet worden berekend met actuele prijs bij markt orders
        pair: args.pair.base + args.pair.quote, // gettable?
        validate: Homey.env.TESTMODE
        //userref: 159753,
        //expiretm: '1676565876' // expires in
      });

      throw new Error(JSON.stringify(result));
      //return JSON.stringify(result);

    });
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

  autocompleteUnits(query, args){
      // filter based on the query
      let results = [];
      results.push({ 
        name: this.prettyPrintBaseQuote(args.pair.base),
        baseorquote: args.pair.base        
       });
      results.push({ 
        name: this.prettyPrintBaseQuote(args.pair.quote),
        baseorquote: args.pair.quote
      });

      return results.filter((x) => {
        return x.name.toLowerCase().includes(query.toLowerCase());
      });

  }

  autocompletePairs(query, args){
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

}

module.exports = KrakenApp;