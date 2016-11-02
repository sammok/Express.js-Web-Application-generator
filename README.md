## Express.js Web Application generator
based on `Express.js`, `Mongodb`, `Redis`

Provides a basic `User models`, `wathing main directories` using `Gulp`, auto restart the Server when you change the listened target.

## How to use

**Step by step:**<br/>
`$ echo "127.0.0.1 http://your-product-develpment-domain.com" | sudo tee -a /etc/hosts` set a local hostname that you want to use

modify the **Server Configuration file** in `./core/config.json`, change the `database`, `server`, `client` fields as your project configuration

`$ npm install` download all dependencies

`$ cd core/ && npm install` download all dependencies

`$ gulp help` to see the task commands

`$ gulp develop` starting the Server, watching main files, auto restart the Server when listened targets changed.