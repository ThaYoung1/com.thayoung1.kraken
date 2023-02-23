'use strict';

require('inspector').open(9231, '0.0.0.0')

const Homey = require('homey');
const KrakenClient = require('kraken-api');

let kraken;
let assetPairs;
let ticker;

class KrakenApp extends Homey.App {
  async onInit() {
    this.log('KrakenApp has been initialized');

    kraken = new KrakenClient(null, null);
    const pairPriceChangesCard = this.homey.flow.getTriggerCard("pair-price-changes");
    pairPriceChangesCard.registerArgumentAutocompleteListener("pair", async (query, args) => { return await this.autocompletePairs(query, args); });
    pairPriceChangesCard.registerRunListener( async (query, args) => {
      this.log('flow run. Price XXBTZEUR: ' + args.result.XXBTZEUR.c[0]);
      //args.result.XXBTZEUR.c[0]
      return true;
    });

    assetPairs = await kraken.api('AssetPairs');
    this.updateTicker = this.updateTicker.bind(this);
    setInterval(this.updateTicker, 10000);

    //this.getOHLC = this.getOHLC.bind(this);
    //setInterval(this.getOHLC, Homey.env.OHLC_REFRESH_RATE * 1000);
  }

  async updateTicker(){
    this.log('ticker');
    ticker = await kraken.api('Ticker');
    const pairPriceChangesCard = this.homey.flow.getTriggerCard("pair-price-changes");
    pairPriceChangesCard.trigger(null, ticker);
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