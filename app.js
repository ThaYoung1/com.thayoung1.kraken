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

    const placeOrderCard = this.homey.flow.getActionCard("place-order");

    const assets = await kraken.api('Assets');

    placeOrderCard.registerArgumentAutocompleteListener(
      "pair",
      async (query, args) => {
        /*const results = [          
          {
            name: "Test naam Bitcoin",
            description: "Test omschrijving"
          },
          {
            name: "Test naam Ethereum",
            description: "Test omschrijving"
          },
          {
            name: "Test naam XRP",
            description: "Test omschrijving Dogecoin"
          }          
        ];*/

        // filter based on the query
        /*
        return results.filter((result) => {
          return result.name.toLowerCase().includes(query.toLowerCase());
       });*/

        // filter based on the query
        let results = Object.values(assets.result);
        let henk = [];
        results.forEach(x => {
          var itm = {
            name: x.altname
          }; 
          henk.push(itm);
        });

        /*return results.filter((result) => {
          return result.altname.toLowerCase().includes(query.toLowerCase());
      });*/
        return henk.filter((y) => {
          return y.name.toLowerCase().includes(query.toLowerCase());
      });
    }
    );

   
    /*this.log(await kraken.api('Assets'));
    this.log(await kraken.api('Balance'));
    this.log(await kraken.api('Ticker', { pair : 'XXBTZUSD' }));
    this.log(await kraken.api('ClosedOrders'));*/
    
    /*this.log(await kraken.api('AddOrder', { 
      ordertype: 'limit', // (req) market, limit, stop-loss, take-profit, stop-loss-limit, take-profit-limit, settle-position
      type: 'buy', // (req) buy, sell
      volume: '1', // 
      pair: 'XXBTZEUR', // gettable?
      price: '100',
      userref: 159753,
      expiretm: '1676565876' // expires in
    }));*/
  }
}

module.exports = MyApp;
