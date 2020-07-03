# nap-time &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)]

## Introduction
This project demonstrates a nap time calculation engine based on finding the most optimal time to take a nap when traveling. Various inputs are taking into consideration such as preferred wake up time and sleep time.

### Tech Stack
This test project is 100% self contained JavaScript library that can be dropped into any environment that support JS integration

* **NodeJS:** 12.x or higher support is needed

## Instalation

### Requirements
- Any PC or MAC with NodeJS 12+ installed.
- Git command line tool
- There are no needs for local web servers or databases

### Repo Install
The project can be cloned from GitHub for free with the following command
```
git clone https://github.com/edster9/nap-time.git

cd nap-time
yarn
```

### Tests
You can execute the tests by running the following
```
yarn run test
```

### Usage
Minimal test example to run a simple calculation

```
const config = require('./modules/config')
const NapCalulator = require('./modules/napCalculator')

function main() {
	const nap = new NapCalulator(config)

	const result = nap.calculate({
		// usual wake time (home)
		usualWakeTime: '07:30',
		// usual bed time (home)
		usualBedTime: '23:00',
		// flight day latest wake time
		flightDayWakeTime: '05:00',
		// preferred wake time (destination)
		preferredWakeTime: '09:00',
		// preferred bed time (destination)
		preferredBedTime: '23:00',
		// preferredBedTime: '17:30',
		// arrival day earliest bed time
		arrivalDayBedTime: '01:30',
		// arrivalDayBedTime: '18:30',
		// home timezone
		homeTimeZone: '-07:00',
		// destination timezone
		destTimeZone: '+01:00',
		// flight departure time
		flightDepartTime: '21:30',
		// flight arrival time
		flightArrivalTime: '13:00',
	})

	result.printDetails(true)
	console.log(result.toString())
}

main()
```
