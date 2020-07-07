const config = require('./modules/config')
const NapCalculator = require('./modules/napCalculator')

function main() {
	const nap = new NapCalculator(config)

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
		// arrival day earliest bed time
		arrivalDayBedTime: '01:30',
		// home timezone
		homeTimeZone: '-07:00',
		// destination timezone
		destTimeZone: '+01:00',
		// flight departure time
		flightDepartTime: '21:30',
		// flight arrival time
		flightArrivalTime: '13:00',
	})

	// console out full debug details
	// result.printDetails(true)

	console.log('--------------')

	// console out the nap result as a string
	console.log(result.toString())
}

main()
