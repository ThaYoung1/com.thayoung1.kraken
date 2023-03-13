# Kraken

Adds support for Kraken on your Homey device.

# First use
After installation you need to give Homey access to your Kraken account. 

There are 2 steps involved in doing so: generating an API key on Kraken and configuring Homey to use the generated API key.

## Generating an API key on Kraken
- Don't have a Kraken account? Create one on https://www.kraken.com/.
- Login to your Kraken account 
- Click on your username in the upper right corner. 
- Choose *Security*, *API*. The API key management screen appears
- Click on *Add key*
- Change the *Key description* as you desire and give the right *Key permissions* to the API key you are creating. For all current functionalities of the Homey App to work, you will need to give these permissions:
  - Funds: Query funds
  - Orders & Trades: Create and modify orders
-  Optionally you can configure the following options:
  -  Apply *IP Whitelisting* so only your Homey can request the API with this key
  -  Give the API key an *Key expiration* date
  -  Limit the amount of historical data to be read by using the *Query start date/time* and/or *Query end date/time* 
- After you have configured your API key, click the *Generate key* button. If you have configured the security settings of Kraken to use 2 factor authentication, fill in your 2FA code and click the *Authorize* button.
- Your new API key will be generated. Copy your *key* and *private key* by using the Copy-buttons. We will need them while configuring the Kraken Homey App. 

## Configuring Homey to use the generated API key
- After installing the Homey App, add a new Device to Homey
- Choose *Kraken*, *Kraken API*
- Click the *Install* button
- Fill in the earlier generated *API Key* and *Private Key* and click on the *Login* button
- On valid key settings, Homey will find a new device *Kraken API*. Click on *Proceed*.
- You are all set for using the App
