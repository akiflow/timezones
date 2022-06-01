# @akiflow/timezones

This package is based on [@vvo/tzdb](https://github.com/vvo/tzdb) by Vincent Voyer. It also includes a set of abbreviations & aliases for backwards compatibility and some additional improvements. 
It is currently used across Akiflow products.

## Usage

### Install
```bash
npm install @akiflow/timezones
# or
yarn add @akiflow/timezones
```

### Usage
```js
// es module
import { Timezones } from '@akiflow/timezones'
// OR commonjs
// const { Timezones } = require('@akiflow/timezones')

// initialize time zones
Timezones.instance.init()

// get list of time zones 
Timezones.instance.getTimezones()
```

### Contributing
Feel free to open an issue, if you find any.


### License
This package and [@vvo/tzdb](https://github.com/vvo/tzdb) are licensed under [MIT License](LICENSE).
