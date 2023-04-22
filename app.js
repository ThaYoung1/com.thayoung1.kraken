'use strict';

if (process.env.DEBUG === '1') {
require('inspector').open(9231, '0.0.0.0', false)
}

const KrakenLib = require('./lib/KrakenLib');
const Homey = require('homey');
const KrakenClient = require('kraken-api');

let kraken = new KrakenClient(null, null); 
let assetPairs, ticker;

class KrakenApp extends Homey.App {
  async onInit() {
    // init settings
    this.homey.settings.set("refreshRate", 30);

    // get flow trigger cards and add listeners
    const pairPriceUpdatedCard = this.homey.flow.getTriggerCard("pair-price-updated");
    // autocomplete list with pairs based on inputs
    pairPriceUpdatedCard.registerArgumentAutocompleteListener("pair", async (query, args) => { return await this.autocompletePairs(query, args); });
    // when a flow gets updated, update the list with pairs that are used in flow cards
    pairPriceUpdatedCard.on('update', (param) => {
      this.homey.flow.getTriggerCard("pair-price-updated").getArgumentValues().then(args => {
        this.homey.settings.set("pairsInCards", args);
      });
    });
    // when flow is triggered
    pairPriceUpdatedCard.registerRunListener( async (query, args) => {
      if (query.pair.base + query.pair.quote == args[0]) {
        return true;
      }
      return false;
    });

    this.updateTicker = this.updateTicker.bind(this);
    setInterval(this.updateTicker, this.homey.settings.get("refreshRate") * 1000);
  }

  async updateTicker(){
    this.log('updateTicker start');

    // get the pairs which are used in flow cards 
    const pairsInCards = this.homey.settings.get("pairsInCards");

    if (pairsInCards) {
      // only do this when there are cards defined
      // get ticker info for all assets and convert to an array we can work with
      try {
        ticker = await kraken.api('Ticker');
      } catch (error) {
        this.log('Error onPoll, kraken.api Ticker: ' + JSON.stringify(error));
        return;
      }
      
      const tickerPair = Object.entries(Object.entries(ticker)[1][1]);
      let done = [];
      // trigger 
      pairsInCards.forEach(x => {
        let result = tickerPair.find(y => y[0] == x.pair.base + x.pair.quote);
        if (result && !done.find(y => y.name == x.name)) {
          done.push(x);
          const tokens = { 
            price: +result[1].c[0],
            pair: x.pair.name };
          const pairPriceUpdatedCard = this.homey.flow.getTriggerCard("pair-price-updated");
          pairPriceUpdatedCard.trigger(tokens, result);
        }
      });
    }

    this.log('updateTicker end');
  }

  async autocompletePairs(query, args){
    // filter based on the query
    if (!assetPairs){
      try {
        assetPairs = await kraken.api('AssetPairs');       
      } catch (error) {
        this.log('Error autocompletePairs, kraken.api AssetPairs: ' + JSON.stringify(error));
        return;
      }
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