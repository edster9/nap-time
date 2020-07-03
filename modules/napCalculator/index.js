const moment = require('moment')
const NapResult = require('./napResult')

class NapCalculator {
	constructor(config) {
		this.config = config
	}

	calculate(data) {
		this.data = data

		try {
			// convert all the string inputs into date objects
			data.flightDepartTimeDT = this._timeStringToDate(data.flightDepartTime, data.homeTimeZone)
			data.flightArrivalTimeDT = this._timeStringToDate(data.flightArrivalTime, data.destTimeZone)

			// fix arrive time rollover to next day by adding one day to arrive time if needed
			if (data.flightDepartTimeDT > data.flightArrivalTimeDT) {
				data.flightArrivalTimeDT.add(1, 'd')
			}

			data.usualWakeTimeDT = this._timeStringToDate(
				data.usualWakeTime,
				data.homeTimeZone,
				data.flightDepartTimeDT,
			)

			data.usualBedTimeDT = this._timeStringToDate(
				data.usualBedTime,
				data.homeTimeZone,
				data.flightDepartTimeDT,
			)

			data.flightDayWakeTimeDT = this._timeStringToDate(
				data.flightDayWakeTime,
				data.homeTimeZone,
				data.flightDepartTimeDT,
			)

			data.preferredWakeTimeDT = this._timeStringToDate(
				data.preferredWakeTime,
				data.destTimeZone,
				data.flightArrivalTimeDT,
			)

			data.preferredBedTimeDT = this._timeStringToDate(
				data.preferredBedTime,
				data.destTimeZone,
				data.flightArrivalTimeDT,
			)

			data.arrivalDayBedTimeDT = this._timeStringToDate(
				data.arrivalDayBedTime,
				data.destTimeZone,
				data.flightArrivalTimeDT,
			)

			// fix destination bedtime time rollover to next day by adding one day to destination time if needed
			// TODO: this is optional due to ambiguous nature of the earliest bedtime context
			// if (data.destBedTimeDT > data.arrivalDayBedTimeDT) {
			// 	data.arrivalDayBedTimeDT.add(1, 'd')
			// }

			const napResultData = this._getNapResults({ napOffset: 0.0 })

			return new NapResult(napResultData)
		} catch (error) {
			console.error(error)

			throw error
		}
	}

	_getNapResults(modifiers) {
		let napResultData = {}
		napResultData.unallowedReasons = []

		napResultData.napUnallowed = false

		// get the duration of the flight in hours
		const flightDuration = this.data.flightArrivalTimeDT.diff(this.data.flightDepartTimeDT)
		this.flightHours = (flightDuration / 1000 / 60 / 60).toFixed(1)

		// get the earliest wake time
		this.wakeupTimeDT =
			this.data.flightDayWakeTimeDT < this.data.usualWakeTimeDT
				? this.data.flightDayWakeTimeDT
				: this.data.usualWakeTimeDT

		// get the latest sleep time
		this.bedTimeDT =
			this.data.preferredBedTimeDT > this.data.arrivalDayBedTimeDT
				? this.data.preferredBedTimeDT
				: this.data.arrivalDayBedTimeDT

		// if bed time is still smaller than flight arrival day then add one more day
		if (this.bedTimeDT < this.data.flightArrivalTimeDT) {
			this.bedTimeDT.add(1, 'd')
		}

		// get the total wakefulness duration in hours
		const totalWakefulnessDuration = this.bedTimeDT.diff(this.wakeupTimeDT)
		this.totalWakefulness = (totalWakefulnessDuration / 1000 / 60 / 60).toFixed(1)

		// calculate nap length
		this.napLength = 0
		if (this.totalWakefulness > 20 && this.totalWakefulness <= 24) {
			this.napLength = 1
		} else if (this.totalWakefulness > 24 && this.totalWakefulness <= 28) {
			this.napLength = 2
		} else if (this.totalWakefulness > 28 && this.totalWakefulness <= 36) {
			this.napLength = 4
		} else if (this.totalWakefulness > 36 && this.totalWakefulness <= 42) {
			this.napLength = 6
		} else if (this.totalWakefulness > 42) {
			this.napLength = 8
		}

		// if there is a nap length > 0 then calculate the start and end times
		if (this.napLength) {
			let napMidpointHours = 0

			const napMidpointDuration = this.data.preferredWakeTimeDT.diff(this.data.usualBedTimeDT)
			napMidpointHours = napMidpointDuration / 1000 / 60 / 60 / 2
			napMidpointHours -= this.napLength / 2

			napResultData.napStartDT = moment(this.data.usualBedTimeDT)
			napResultData.napStartDT.add(napMidpointHours, 'h')
			napResultData.napEndDT = moment(napResultData.napStartDT)
			napResultData.napEndDT.add(this.napLength, 'h')

			// modify the nap if special modifier are present
			if (modifiers) {
				// modify the nap start stop if a modifier is provided
				if (modifiers.napOffset > 0) {
					napResultData.napStartDT.add(modifiers.napOffset, 'h')
					napResultData.napEndDT.add(modifiers.napOffset, 'h')
				} else {
					napResultData.napStartDT.subtract(modifiers.napOffset, 'h')
					napResultData.napEndDT.subtract(modifiers.napOffset, 'h')
				}
			}

			// 1a) 4 hours before take off until 1 hour after take off
			const napAfterTakeOffDuration = napResultData.napStartDT.diff(this.data.flightDepartTimeDT)
			napResultData.napAfterTakeOff = (napAfterTakeOffDuration / 1000 / 60 / 60).toFixed(1)

			if (napResultData.napAfterTakeOff <= 1 && napResultData.napAfterTakeOff >= -4) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push('4 hours before take off until 1 hour after take off')
			}

			// 1b) 1 hour beofre landing until 2 hours after landing
			const napBeforeArrivalOffDuration = this.data.flightArrivalTimeDT.diff(napResultData.napEndDT)
			napResultData.napBeforeArrival = (napBeforeArrivalOffDuration / 1000 / 60 / 60).toFixed(1)

			if (napResultData.napBeforeArrival <= 1 && napResultData.napBeforeArrival >= -2) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push('1 hour beofre landing until 2 hours after landing')
			}

			// 1c)
			// TODO: no layover support right now

			// get the nap start and nap end offsets from the wake up and sleep times
			const napStartOffsetDuration = napResultData.napStartDT.diff(this.wakeupTimeDT)
			napResultData.napStartOffset = (napStartOffsetDuration / 1000 / 60 / 60).toFixed(1)

			const napEndOffsetDuration = this.bedTimeDT.diff(napResultData.napEndDT)
			napResultData.napEndOffset = (napEndOffsetDuration / 1000 / 60 / 60).toFixed(1)

			// 2a) A nap length of 1 hour must start at least 4 hours after flight day wake time and end at least 6 hours before arrival day bed time
			if (this.napLength === 1 && (napResultData.napStartOffset < 4 || napResultData.napEndOffset < 6)) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					'A nap length of 1 hour must start at least 4 hours after flight day wake time and end at least 6 hours before arrival day bed time',
				)
			}

			// 2b) A nap length of 2 hours must start at least 6 hours after flight day wake time and end at least 8 hours before arrival day bed time
			if (this.napLength === 2 && (napResultData.napStartOffset < 6 || napResultData.napEndOffset < 8)) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					'A nap length of 2 hours must start at least 6 hours after flight day wake time and end at least 8 hours before arrival day bed time',
				)
			}

			// 2c) A nap length of 4 hours must start at least 9 hours after flight day wake time and end at least 10 hours before arrival day bed time
			if (this.napLength === 4 && (napResultData.napStartOffset < 9 || napResultData.napEndOffset < 10)) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					'A nap length of 4 hours must start at least 9 hours after flight day wake time and end at least 10 hours before arrival day bed time',
				)
			}

			// 2d) A nap length of 6 hours must start at least 12 hours after flight day wake time and end at least 12 hours before arrival day bed time
			if (this.napLength === 6 && (napResultData.napStartOffset < 12 || napResultData.napEndOffset < 12)) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					'A nap length of 6 hours must start at least 12 hours after flight day wake time and end at least 12 hours before arrival day bed time',
				)
			}

			// 2e) A nap length of 8 hours must start at least 14 hours after flight day wake time and end at least 12 hours before arrival day bed time
			if (this.napLength === 8 && (napResultData.napStartOffset < 14 || napResultData.napEndOffset < 12)) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					'A nap length of 8 hours must start at least 14 hours after flight day wake time and end at least 12 hours before arrival day bed time',
				)
			}
			// 3) The traveler must not have a time period of more than 20 hours without sleep
		} else if (this.totalWakefulness > 20) {
			napResultData.napUnallowed = true
			napResultData.unallowedReasons.push(
				'The traveler must not have a time period of more than 20 hours without sleep',
			)
		}

		// prepare the nap result data object
		napResultData = {
			...napResultData,
			inputs: this.data,
			flightHours: this.flightHours,
			totalWakefulness: this.totalWakefulness,
			timeNow: moment(),
			wakeupTimeDT: this.wakeupTimeDT,
			bedTimeDT: this.bedTimeDT,
			napLength: this.napLength,
			modified: false,
		}

		return napResultData
	}

	_timeStringToDate(timeString, timeZone, fromDate) {
		// make sure time is a string
		if (typeof timeString !== 'string') {
			throw `Invalid time format: ${timeString}`
		}

		const hmsArray = timeString.split(':')

		// make sure time string is correct format of xx:xx
		if (hmsArray.length < 2) {
			throw `Invalid time format: ${timeString}`
		}

		// further validation of time format for valid integers
		const hours = +hmsArray[0]
		const minutes = +hmsArray[1]
		const seconds = +hmsArray[2]

		if (isNaN(hours) || isNaN(minutes)) {
			throw `Invalid time format: ${timeString}`
		}

		if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
			throw `Invalid time format: ${timeString}`
		}

		// create a datetime object and reset the hours / minutes / seconds
		const dateTime = fromDate ? moment(fromDate) : moment()

		if (timeZone) {
			dateTime.utcOffset(timeZone)
		}

		dateTime.set('hour', +hmsArray[0])
		dateTime.set('minute', +hmsArray[1])

		// is there an optional seconds in this time format?
		if (hmsArray.length === 3) {
			if (isNaN(seconds)) {
				throw `Invalid time format: ${timeString}`
			}

			if (seconds < 0 || seconds > 59) {
				throw `Invalid time format: ${timeString}`
			}

			dateTime.set('second', +hmsArray[2])
		} else {
			dateTime.set('second', 0)
		}

		return dateTime
	}
}

module.exports = NapCalculator
