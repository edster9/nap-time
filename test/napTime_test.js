const assert = require('assert')
const config = require('../modules/config')
const NapCalulator = require('../modules/napCalculator')

describe('Nap Time', () => {
	const nap = new NapCalulator(config)

	before(async () => {})

	it('Nap modifier to not move nap', async () => {
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
			'Yes, the nap can be placed without modifiying the nap time\nNap Start Time: 22:00 GMT-7 / 06:00 GMT+1\nNap End Time: 02:00 GMT-7 / 10:00 GMT+1'

		assert.equal(result.toString(), resultString)
	})

	it('Nap modifier to push nap forward', async () => {
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
			'Yes, the nap can be placed by modifiying the nap time\nNap Start Time: 22:45 GMT-7 / 06:45 GMT+1\nNap End Time: 02:45 GMT-7 / 10:45 GMT+1'

		assert.equal(result.toString(), resultString)
	})
})
