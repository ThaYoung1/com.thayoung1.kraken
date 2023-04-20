'use strict';

const { Device } = require('homey');
const KrakenClient = require('kraken-api');

let kraken;
let assets, assetPairs;
let pollInterval; 

class KrakenAPIDevice extends Device { 
  async onInit() {
    const settings = this.getSettings();
    kraken = new KrakenClient(settings.apiKey, settings.privateKey);

    pollInterval = this.homey.setInterval(this.onPoll.bind(this), settings.updateInterval * 1000);

    const placeMarketOrderCard = this.homey.flow.getActionCard("place-market-order");
    placeMarketOrderCard.registerArgumentAutocompleteListener("pair", async (query, args) => { return await this.autocompletePairs(query, args); });
    placeMarketOrderCard.registerArgumentAutocompleteListener("unit", async (query, args) => { return await this.autocompleteUnits(query, args); });
    placeMarketOrderCard.registerRunListener(async (args, state) => {
      // the need to calculate order volume
      var volume = await this.getVolume(args);
      var result = await this.addOrder('market', volume, args);
      //throw new Error(JSON.stringify(result));
      return true;
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

  async onAdded(){}

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.find(key => key == 'updateInterval')){
      this.homey.clearInterval(pollInterval);
      pollInterval = this.homey.setInterval(this.onPoll.bind(this), newSettings.updateInterval * 1000);
    }
  }

  async onRenamed(name){}

  async onDeleted() {
    this.homey.clearInterval(pollInterval);
    this.log('MyDevice has been deleted');
  }

  async onPoll() {
    this.log('onPoll start');

    assets = await kraken.api('Assets');
    let arrAssets = Object.entries(assets.result).map(([key, val]) => [key, val]);
    
    let balance = await kraken.api('Balance');    
    let arrBalance = Object.entries(balance.result).map(([key, val]) => [key, val]);

    arrBalance.forEach(async b => {
      let asset = arrAssets.filter(a => a[0] == b[0]);
      if (asset){
        if (parseFloat((+b[1]).toFixed(+asset[0][1].display_decimals)) > 0){
          if (!this.hasCapability('meter_wallet.' + b[0])) {
            await this.addCapability('meter_wallet.' + b[0]).catch(this.error);
          }
          if (this.getCapabilityValue('meter_wallet.' + b[0]) != +b[1]) {
            await this.setCapabilityValue('meter_wallet.' + b[0], +b[1]).catch(this.error);
            await this.setCapabilityOptions('meter_wallet.' + b[0], { 
              units: asset[0][1].altname,
              title: asset[0][1].altname + ' Balance',
              decimals: +asset[0][1].display_decimals
            }).catch(this.error); 
          }
        } 
      }
    });
    this.log('onPoll end');
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
        var ticker = await kraken.api('Ticker', { pair: args.pair.base + args.pair.quote });
        var arrTicker = Object.values(ticker.result);
        price = arrTicker[0].c[0];
      }

      var volume = args.volume / price;
      if (volume < args.pair.ordermin) {
        throw new Error(this.homey.__("Error_MinOrderSize", { ordermin: args.pair.ordermin, unit: args.pair.base }));
      }
    }
    return volume;
  }

  async autocompleteUnits(query, args){
      let results = [];

      if (!assets){
        assets = await kraken.api('Assets');
      }
      let arrAssets = Object.entries(assets.result).map(([key, val]) => [key, val]);
      
      results.push({
        name: arrAssets.find(x => x[0] == args.pair.base)[1].altname,
        baseorquote: args.pair.base
      });
      results.push({
        name: arrAssets.find(x => x[0] == args.pair.quote)[1].altname,
        baseorquote: args.pair.quote
      });

      return results.filter((x) => {
        return x.name.toLowerCase().includes(query.toLowerCase());
      });

  }

  async autocompletePairs(query, args){
     // filter based on the query
     //kraken = new KrakenClient(this.getSetting('apiKey'), this.getSetting('privateKey'));
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
}

module.exports = KrakenAPIDevice;
