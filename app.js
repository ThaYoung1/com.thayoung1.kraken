'use strict';

require('inspector').open(9231, '0.0.0.0')

const Homey = require('homey');
const KrakenClient = require('kraken-api');

let assetPairs;
let kraken;

class KrakenApp extends Homey.App {
  async onInit() {
    this.log('KrakenApp has been initialized');

    kraken = new KrakenClient(key, secret);
    const pairPriceChangesCard = this.homey.flow.getActionCard("crypto-price-changes");
    pairPriceChangesCard.registerArgumentAutocompleteListener("pair", async (query, args) => { return await this.autocompletePairs(query, args); });

    this.getOHLC = this.getOHLC.bind(this);
    //setInterval(this.getOHLC, Homey.env.OHLC_REFRESH_RATE * 1000);
  }

  async getOHLC(){
    var result = await kraken.api('OHLC', { pair: 'XBTEUR', interval: 1440 });    
    this.log(JSON.stringify(result));
  }

  async autocompletePairs(query, args){
    // filter based on the query
    kraken = new KrakenClient(null,null);
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

module.exports = KrakenApp;