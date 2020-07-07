const assert = require('assert')
const config = require('../modules/config')
const NapCalculator = require('../modules/napCalculator')

describe('Nap Time', () => {
	const nap = new NapCalculator(config)

	before(async () => {})

	it('No nap is needed', async () => {
		const result = nap.calculate({
			// usual wake time (home)
			usualWakeTime: '08:00',
			// usual bed time (home)
			usualBedTime: '22:00',
			// flight day latest wake time
			flightDayWakeTime: '08:00',
			// preferred wake time (destination)
			preferredWakeTime: '09:00',
			// preferred bed time (destination)
			preferredBedTime: '23:00',
			// arrival day earliest bed time
			arrivalDayBedTime: '23:00',
			// home timezone
			homeTimeZone: '-07:00',
			// destination timezone
			destTimeZone: '-07:00',
			// flight departure time
			flightDepartTime: '13:00',
			// flight arrival time
			flightArrivalTime: '17:00',
		})

		const resultString = 'No nap is needed'

		assert.equal(result.toString(), resultString)
	})

	it('No need to move nap time forward', async () => {
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
			flightDepartTime: '20:30',
			// flight arrival time
			flightArrivalTime: '13:00',
		})

		const resultString =
			'Yes, the nap can be placed without modifying the nap time\nNap Start Time: 22:00 GMT-7 / 06:00 GMT+1\nNap End Time: 02:00 GMT-7 / 10:00 GMT+1'

		assert.equal(result.toString(), resultString)
	})

	it('Need to move nap time forward', async () => {
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

		const resultString =
			'Yes, the nap can be placed by modifying the nap time\nNap Start Time: 22:30 GMT-7 / 06:30 GMT+1\nNap End Time: 02:30 GMT-7 / 10:30 GMT+1\nOriginal Nap Start Time: 22:00 GMT-7 / 06:30 GMT+1\nOriginal Nap End Time: 02:00 GMT-7 / 10:30 GMT+1'

		assert.equal(result.toString(), resultString)
	})
})
