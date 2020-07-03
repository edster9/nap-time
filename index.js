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

	console.log('--------')
	result.printDetails(true)
	console.log(result.toString())

	/*
	const result2 = nap.calculate({
		usualWakeTime: '07:30',
		usualBedTime: '23:00',
		flightDayWakeTime: '05:00',
		destWakeTime: '09:00',
		destBedTime: '23:00',
		arrivalDayBedTime: '01:30',
		homeTimeZone: '-07:00',
		destTimeZone: '-04:00',
		flightDepartTime: '08:00',
		flightArrivalTime: '16:00',
	})
	*/

	// console.log(result.toString())

	// result2.printDetails()
}

main()
