const moment = require('moment')
const NapResult = require('./napResult')

class NapCalculator {
	/**
	 *
	 * @param {configuration data} config
	 */
	constructor(config) {
		this.config = config
	}

	/**
	 * Summary. Run the sleep calculation based the incoming parameters
	 *
	 * @param {calculate input object} data
	 */
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

			// let napResultData = this._getNapResults({ napOffset: 0.0 })

			// run the nap result calculation first time without any nap modifiers
			let napResultData = this._getNapResults()
			let modified = false

			// if nap is not allowed try to move forward the nap time X hours a time
			if (napResultData.napUnallowed) {
				let napOffset = 0.0

				while (napResultData.napUnallowed) {
					// console.log(`OFFSET NAP +${this.config.napOffsetAttempt}`)
					modified = true
					napOffset += this.config.napOffsetAttempt
					napResultData = this._getNapResults({ napOffset })

					if (napOffset > napResultData.flightHours) {
						break
					}
				}
			}

			// if nap is still not allowed then try to move back nap time X hours a time
			if (napResultData.napUnallowed) {
				let napOffset = 0.0

				while (napResultData.napUnallowed) {
					// console.log(`OFFSET NAP -${this.config.napOffsetAttempt}`)
					modified = true
					napOffset -= this.config.napOffsetAttempt
					napResultData = this._getNapResults({ napOffset })

					if (napOffset > napResultData.flightHours) {
						break
					}
				}
			}

			napResultData.modified = modified
			return new NapResult(napResultData)
		} catch (error) {
			console.error(error)

			throw error
		}
	}

	/**
	 * Summary. Calculate the nap time and take into account any modifier passed in
	 *
	 * @param {modifiers object} modifiers
	 *
	 * @return {napResultData object}
	 */
	_getNapResults(modifiers) {
		let napResultData = {}
		napResultData.unallowedReasons = []
		napResultData.modified = false
		// napResultData.unallowedConditions = {}

		napResultData.napUnallowed = false

		// get the duration of the flight in hours
		const flightDuration = this.data.flightArrivalTimeDT.diff(this.data.flightDepartTimeDT)
		this.flightHours = (flightDuration / this.config.msDay).toFixed(1)

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
		this.totalWakefulness = (totalWakefulnessDuration / this.config.msDay).toFixed(1)

		// calculate nap length
		this.napLength = 0
		if (
			this.totalWakefulness > this.config.naps[0].minWakefulness &&
			this.totalWakefulness <= this.config.naps[0].maxWakefulness
		) {
			this.napLength = this.config.naps[0].length
		} else if (
			this.totalWakefulness > this.config.naps[1].minWakefulness &&
			this.totalWakefulness <= this.config.naps[1].maxWakefulness
		) {
			this.napLength = this.config.naps[1].length
		} else if (
			this.totalWakefulness > this.config.naps[2].minWakefulness &&
			this.totalWakefulness <= this.config.naps[2].maxWakefulness
		) {
			this.napLength = this.config.naps[2].length
		} else if (
			this.totalWakefulness > this.config.naps[3].minWakefulness &&
			this.totalWakefulness <= this.config.naps[3].maxWakefulness
		) {
			this.napLength = this.config.naps[3].length
		} else if (this.totalWakefulness > this.config.naps[4].minWakefulness) {
			this.napLength = this.config.naps[4].length
		}

		// if there is a nap length > 0 then calculate the start and end times
		if (this.napLength) {
			let napMidpointHours = 0

			// create the nap midpoint
			const napMidpointDuration = this.data.preferredWakeTimeDT.diff(this.data.usualBedTimeDT)
			napMidpointHours = napMidpointDuration / this.config.msDay / 2
			napMidpointHours -= this.napLength / 2

			// create the nap start and end times
			napResultData.napStartDT = moment(this.data.usualBedTimeDT)
			napResultData.napStartDT.add(napMidpointHours, 'h')
			napResultData.napEndDT = moment(napResultData.napStartDT)
			napResultData.napEndDT.add(this.napLength, 'h')

			// save the original times
			napResultData.napOriginalStartDT = moment(napResultData.napStartDT)
			napResultData.napOriginalEndDT = moment(napResultData.napEndDT)

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

			// RUN ALL THE UNALLOWED VALIDATION //

			// 1a) X hours before take off until X hour after take off
			const napAfterTakeOffDuration = napResultData.napStartDT.diff(this.data.flightDepartTimeDT)
			napResultData.napAfterTakeOff = (napAfterTakeOffDuration / this.config.msDay).toFixed(1)

			if (
				napResultData.napAfterTakeOff <= this.config.hoursAllowedAfterTakeOff &&
				napResultData.napAfterTakeOff >= -this.config.hoursAllowedBeforeTakeOff
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`${this.config.hoursAllowedBeforeTakeOff} hours before take off until ${this.config.hoursAllowedAfterTakeOff} hour after take off`,
				)
			}

			// 1b) X hour before landing until X hours after landing
			const napBeforeArrivalOffDuration = this.data.flightArrivalTimeDT.diff(napResultData.napEndDT)
			napResultData.napBeforeArrival = (napBeforeArrivalOffDuration / this.config.msDay).toFixed(1)

			if (
				napResultData.napBeforeArrival <= this.config.hoursAllowedBeforeLanding &&
				napResultData.napBeforeArrival >= -this.config.hoursAllowedAfterLanding
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`${this.config.hoursAllowedBeforeLanding} hour before landing until ${this.config.hoursAllowedAfterLanding} hours after landing`,
				)
			}

			// 1c)
			// TODO: no layover support right now

			// get the nap start and nap end offsets from the wake up and sleep times
			const napStartOffsetDuration = napResultData.napStartDT.diff(this.wakeupTimeDT)
			napResultData.napStartOffset = (napStartOffsetDuration / this.config.msDay).toFixed(1)

			const napEndOffsetDuration = this.bedTimeDT.diff(napResultData.napEndDT)
			napResultData.napEndOffset = (napEndOffsetDuration / this.config.msDay).toFixed(1)

			// TODO: move all hard coded vars into the config module

			// 2a) A nap length of 1 hour must start at least 4 hours after flight day wake time and end at least 6 hours before arrival day bed time
			if (
				this.napLength === this.config.naps[0].length &&
				(napResultData.napStartOffset < 4 || napResultData.napEndOffset < 6)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`A nap length of ${this.config.naps[0].length} hour must start at least 4 hours after flight day wake time and end at least 6 hours before arrival day bed time`,
				)
			}

			// 2b) A nap length of 2 hours must start at least 6 hours after flight day wake time and end at least 8 hours before arrival day bed time
			if (
				this.napLength === this.config.naps[1].length &&
				(napResultData.napStartOffset < 6 || napResultData.napEndOffset < 8)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`A nap length of ${this.config.naps[1].length} hours must start at least 6 hours after flight day wake time and end at least 8 hours before arrival day bed time`,
				)
			}

			// 2c) A nap length of 4 hours must start at least 9 hours after flight day wake time and end at least 10 hours before arrival day bed time
			if (
				this.napLength === this.config.naps[2].length &&
				(napResultData.napStartOffset < 9 || napResultData.napEndOffset < 10)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`A nap length of ${this.config.naps[2].length} hours must start at least 9 hours after flight day wake time and end at least 10 hours before arrival day bed time`,
				)
			}

			// 2d) A nap length of 6 hours must start at least 12 hours after flight day wake time and end at least 12 hours before arrival day bed time
			if (
				this.napLength === this.config.naps[3].length &&
				(napResultData.napStartOffset < 12 || napResultData.napEndOffset < 12)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`A nap length of ${this.config.naps[3].length} hours must start at least 12 hours after flight day wake time and end at least 12 hours before arrival day bed time`,
				)
			}

			// 2e) A nap length of 8 hours must start at least 14 hours after flight day wake time and end at least 12 hours before arrival day bed time
			if (
				this.napLength === this.config.naps[4].length &&
				(napResultData.napStartOffset < 14 || napResultData.napEndOffset < 12)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`A nap length of ${this.config.naps[4].length} hours must start at least 14 hours after flight day wake time and end at least 12 hours before arrival day bed time`,
				)
			}
			// 3) The traveler must not have a time period of more than 20 hours without sleep
		} else if (this.totalWakefulness > 20) {
			napResultData.napUnallowed = true
			napResultData.unallowedReasons.push(
				'The traveler must not have a time period of more than 20 hours without sleep',
			)
		}

		// END VALIDATIONS //

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

	/**
	 * Summary. Time string to moment date object
	 *
	 * @param {string} 					timeString
	 * @param {string} 					timeZone
	 * @param {moment object} 	fromDate
	 *
	 * @return {moment object}
	 */
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

		// create a date time object and reset the hours / minutes / seconds
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
