'use strict';

const { Driver } = require('homey');
const KrakenClient = require('kraken-api');

let kraken;

class KrakenAPIDriver extends Driver {
  async onInit() {
  }

  async onPair(session) {
    let apiKey;
    let privateKey;
    let balance;

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
  
 
}

module.exports = KrakenAPIDriver;
