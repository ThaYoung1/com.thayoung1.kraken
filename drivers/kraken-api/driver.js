'use strict';

const { Driver } = require('homey');
const KrakenClient = require('kraken-api');

class KrakenAPIDriver extends Driver {
  async onInit() {
    this.log('KrakenAPIDriver has been initialized');

    this.flowcard = this.homey.flow.getDeviceTriggerCard("device-place-market-order");
    placeDeviceMarketOrderCard.registerArgumentAutocompleteListener("pair", async (query, args) => { return this.autocompletePairs(query, args); });
    placeDeviceMarketOrderCard.registerArgumentAutocompleteListener("unit", async (query, args) => { return this.autocompleteUnits(query, args); });
    placeDeviceMarketOrderCard.registerRunListener(async (args, state) => {
      // the need to calculate order volume
      var volume = await this.getVolume(args);
      var result = await this.addOrder('market', volume, args);
      throw new Error(JSON.stringify(result));
    });
  }

  
  async addOrder(ordertype, volume, args){
    var result = await kraken.api('AddOrder', { 
      ordertype: ordertype, // (req) market, limit, stop-loss, take-profit, stop-loss-limit, take-profit-limit, settle-position
      type: args.type, // (req) buy, sell
      volume: volume, // moet worden berekend met actuele prijs bij markt orders
      pair: args.pair.base + args.pair.quote, // gettable?
      validate: Homey.env.TESTMODE,
      price: args.price
      //userref: 159753,
      //expiretm: '1676565876' // expires in
    });

    return result;
  }

  async getVolume(args, price = null){
    var volume = args.volume;

    if (args.unit.baseorquote == args.pair.quote){
      if (!price){
        var ticker = await kraken.api('Ticker', { pair: args.pair.base + args.pair.quote });
        var arrTicker = Object.values(ticker.result);
        price = arrTicker[0].c[0];
      }

      var volume = args.volume / price;
      if (volume < args.pair.ordermin) {
        throw new Error('Fout: Minimale ordergrootte van ' + args.pair.ordermin + ' niet gehaald');
      }
    }
    return volume;
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

  async onPair(session) {
    let apiKey;
    let privateKey;
    let balance;
    let kraken;

    session.setHandler("login", async (data) => {
      apiKey = data.username;
      privateKey = data.password;

      kraken = new KrakenClient(apiKey, privateKey);

      try {
        balance = await kraken.api('Balance');
      } catch (error) {
        return false;
      }

      return true;
      // return true to continue adding the device if the login succeeded
      // return false to indicate to the user the login attempt failed
      // thrown errors will also be shown to the user
    });

    session.setHandler("list_devices", async () => {
      balance = await kraken.api('Balance');

      return {
        name: 'Kraken API',
        data: {
          id: Date.now(),
        },
        settings: {
          // Store username & password in settings
          // so the user can change them later
          apiKey,
          privateKey,
        },
      };

    });
  }

  async onPairListDevices() {
    return [
      // Example device data, note that `store` is optional
      // {
      //   name: 'My Device',
      //   data: {
      //     id: 'my-device',
      //   },
      //   store: {
      //     address: '127.0.0.1',
      //   },
      // },
    ];
  }

}

module.exports = KrakenAPIDriver;
