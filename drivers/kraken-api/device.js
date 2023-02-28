'use strict';

const { Device } = require('homey');
const KrakenClient = require('kraken-api');

let assetPairs;
let kraken;

class MyDevice extends Device { 
  async onInit() {
    this.log('MyDevice onInit');

    //this.onPollInterval = setInterval(this.onPoll.bind(this), 20000);
    this.homey.setInterval(this.onPoll.bind(this), 20000)

    kraken = new KrakenClient(this.getSetting('apiKey'), this.getSetting('privateKey'));

    const placeMarketOrderCard = this.homey.flow.getActionCard("place-market-order");
    placeMarketOrderCard.registerArgumentAutocompleteListener("pair", async (query, args) => { return await this.autocompletePairs(query, args); });
    placeMarketOrderCard.registerArgumentAutocompleteListener("unit", async (query, args) => { return await this.autocompleteUnits(query, args); });
    placeMarketOrderCard.registerRunListener(async (args, state) => {
      // the need to calculate order volume
      var volume = await this.getVolume(args);
      var result = await this.addOrder('market', volume, args);
      throw new Error(JSON.stringify(result));
    });

    const placeLimitOrderCard = this.homey.flow.getActionCard("place-limit-order");
    placeLimitOrderCard.registerArgumentAutocompleteListener("pair", async (query, args) => { return await this.autocompletePairs(query, args); });
    placeLimitOrderCard.registerArgumentAutocompleteListener("unit", async (query, args) => { return await this.autocompleteUnits(query, args); });
    placeLimitOrderCard.registerRunListener(async (args, state) => {
      // the need to calculate order volume
      var volume = await this.getVolume(args, args.price);
      var result = await this.addOrder('limit', volume, args);
      throw new Error(JSON.stringify(result));
    });

  }

  async onAdded() {
    this.log('MyDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MyDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    if (this.onPollInterval){
      clearInterval(this.onPollInterval);
    }
    this.log('MyDevice has been deleted');
  }

  
  async onPoll() {
    let balance = await kraken.api('Balance');
    let arrBalance = Object.entries(balance.result).map(([key, val]) => [key, val]);
    arrBalance.forEach(async b => {
      if (+b[1] > 0){
        if (!this.hasCapability('meter_wallet.' + b[0])) {
          await this.addCapability('meter_wallet.' + b[0]).catch(this.error);
        }
        if (this.getCapabilityValue('meter_wallet.' + b[0]) != +b[1]) {
          await this.setCapabilityValue('meter_wallet.' + b[0], +b[1]).catch(this.error);
          await this.setCapabilityOptions('meter_wallet.' + b[0], { units: this.prettyPrintBaseQuote(b[0]) }).catch(this.error); 
        }
      }
    });
  }
  
  async addOrder(ordertype, volume, args){
    var result = await kraken.api('AddOrder', { 
      ordertype: ordertype, // (req) market, limit, stop-loss, take-profit, stop-loss-limit, take-profit-limit, settle-position
      type: args.type, // (req) buy, sell
      volume: volume, // moet worden berekend met actuele prijs bij markt orders
      pair: args.pair.base + args.pair.quote, // gettable?
      validate: this.getSetting('apitestmode'),
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
        kraken = new KrakenClient(this.getSetting('apiKey'), this.getSetting('privateKey'));
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

  async autocompleteUnits(query, args){
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

  async autocompletePairs(query, args){
     // filter based on the query
     kraken = new KrakenClient(this.getSetting('apiKey'), this.getSetting('privateKey'));
     if (!assetPairs){
      assetPairs = await kraken.api('AssetPairs');
     }

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

module.exports = MyDevice;
