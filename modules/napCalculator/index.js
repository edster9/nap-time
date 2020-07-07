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

			// save the original times
			const napOriginalStartDT = moment(napResultData.napStartDT)
			const napOriginalEndDT = moment(napResultData.napEndDT)
			// const usualOriginalWakeTimeDT = moment(this.data.modifiedUsualWakeTimeDT)

			// if nap is not allowed try to move forward the nap time X hours a time
			if (napResultData.napUnallowed) {
				let napOffset = 0.0

				while (napResultData.napUnallowed) {
					// console.log(`OFFSET NAP +${this.config.napOffsetAttempt}`)

					modified = true
					napOffset += this.config.napOffsetAttempt
					napResultData = this._getNapResults({ napOffset })

					// console.log(`NAP PUSH FORWARD +${napResultData.napStartDT}`)

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

					// console.log(`NAP PUSH BACK +${napResultData.napStartDT}`)

					if (napOffset < -napResultData.flightHours) {
						break
					}
				}
			}

			// now try to move the flight day wake time to earlier by 1.5 hours
			if (napResultData.napUnallowed) {
				let wakeOffset = 0.0

				while (napResultData.napUnallowed) {
					// console.log(`OFFSET NAP -${this.config.napOffsetAttempt}`)

					modified = true
					wakeOffset -= this.config.napOffsetAttempt
					napResultData = this._getNapResults({ wakeOffset })

					// console.log(`WAKE TIME PUSH BACK -${this.data.usualWakeTimeDT}`)

					if (wakeOffset < -1.5) {
						break
					}
				}
			}

			// TODO: now try to move the flight day wake time to later by 1.5 hours
			if (napResultData.napUnallowed) {
				let wakeOffset = 0.0

				while (napResultData.napUnallowed) {
					// console.log(`OFFSET NAP -${this.config.napOffsetAttempt}`)

					modified = true
					wakeOffset += this.config.napOffsetAttempt
					napResultData = this._getNapResults({ wakeOffset })

					// console.log(`WAKE TIME PUSH BACK -${this.data.usualWakeTimeDT}`)

					if (wakeOffset > 1.5) {
						break
					}
				}
			}

			// TODO: now try to move the arrival day sleep time to later by 1.5 hours

			// TODO: now try to move the arrival day sleep time to earlier by 1.5 hours

			// TODO: finally try to make the nap length shorter

			napResultData.modified = modified
			napResultData.napOriginalStartDT = napOriginalStartDT
			napResultData.napOriginalEndDT = napOriginalEndDT
			napResultData.modifiedUsualWakeTimeDT = this.data.modifiedUsualWakeTimeDT

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

		napResultData.napUnallowed = false

		// get the duration of the flight in hours
		const flightDuration = this.data.flightArrivalTimeDT.diff(this.data.flightDepartTimeDT)
		this.flightHours = (flightDuration / this.config.msDay).toFixed(2)

		this.data.modifiedUsualWakeTimeDT = moment(this.data.usualWakeTimeDT)

		if (modifiers) {
			// modify the nap wake up time if a modifier is provided
			if (modifiers.wakeOffset && modifiers.wakeOffset !== 0) {
				this.data.modifiedUsualWakeTimeDT.add(modifiers.wakeOffset, 'h')
			}
		}

		// get the earliest wake time
		this.wakeupTimeDT =
			this.data.flightDayWakeTimeDT < this.data.modifiedUsualWakeTimeDT
				? this.data.flightDayWakeTimeDT
				: this.data.modifiedUsualWakeTimeDT

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
		this.totalWakefulness = (totalWakefulnessDuration / this.config.msDay).toFixed(2)

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

			if (modifiers) {
				// modify the nap start stop if a modifier is provided
				if (modifiers.napOffset && modifiers.napOffset !== 0) {
					napResultData.napStartDT.add(modifiers.napOffset, 'h')
					napResultData.napEndDT.add(modifiers.napOffset, 'h')
				}
			}

			// RUN ALL THE UNALLOWED VALIDATION //

			// 1a) X hours before take off until X hour after take off
			const noBeforeTakeOffDT = moment(this.data.flightDepartTimeDT).subtract(
				this.config.hoursAllowedBeforeTakeOff,
				'h',
			)
			const noAfterTakeOffDT = moment(this.data.flightDepartTimeDT).add(
				this.config.hoursAllowedAfterTakeOff,
				'h',
			)

			const noBeforeLandingDT = moment(this.data.flightArrivalTimeDT).subtract(
				this.config.hoursAllowedBeforeLanding,
				'h',
			)
			const noAfterLandingDT = moment(this.data.flightArrivalTimeDT).add(
				this.config.hoursAllowedAfterLanding,
				'h',
			)

			if (
				napResultData.napStartDT.isBetween(noBeforeTakeOffDT, noAfterTakeOffDT) ||
				napResultData.napStartDT.isBetween(noBeforeLandingDT, noAfterLandingDT)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`${this.config.hoursAllowedBeforeTakeOff} hours before take off until ${this.config.hoursAllowedAfterTakeOff} hour after take off`,
				)
			}

			if (
				napResultData.napEndDT.isBetween(noBeforeTakeOffDT, noAfterTakeOffDT) ||
				napResultData.napEndDT.isBetween(noBeforeLandingDT, noAfterLandingDT)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`${this.config.hoursAllowedBeforeTakeOff} hours before take off until ${this.config.hoursAllowedAfterTakeOff} hour after take off`,
				)
			}

			if (this.data.flightArrivalTimeDT.isBetween(napResultData.napStartDT, napResultData.napEndDT)) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push('Flight arrival time is between nap times')
			}

			if (this.data.flightDepartTimeDT.isBetween(napResultData.napStartDT, napResultData.napEndDT)) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push('Flight landing time is between nap times')
			}

			// 1c)
			// TODO: no layover support right now

			// get the nap start and nap end offsets from the wake up and sleep times
			const napStartOffsetDuration = napResultData.napStartDT.diff(this.wakeupTimeDT)
			napResultData.napStartOffset = (napStartOffsetDuration / this.config.msDay).toFixed(2)

			const napEndOffsetDuration = this.bedTimeDT.diff(napResultData.napEndDT)
			napResultData.napEndOffset = (napEndOffsetDuration / this.config.msDay).toFixed(2)

			// TODO: move all hard coded vars into the config module

			// 2a) A nap length of 1 hour must start at least 4 hours after flight day wake time and end at least 6 hours before arrival day bed time
			if (
				this.napLength === this.config.naps[0].length &&
				(napResultData.napStartOffset < this.config.napStartOffset ||
					napResultData.napEndOffset < this.config.napEndOffset)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`A nap length of ${this.config.naps[0].length} hour must start at least ${this.config.napStartOffset} hours after flight day wake time and end at least ${this.config.napEndOffset} hours before arrival day bed time`,
				)
			}

			// 2b) A nap length of 2 hours must start at least 6 hours after flight day wake time and end at least 8 hours before arrival day bed time
			if (
				this.napLength === this.config.naps[1].length &&
				(napResultData.napStartOffset < this.config.napStartOffset ||
					napResultData.napEndOffset < this.config.napEndOffset)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`A nap length of ${this.config.naps[1].length} hours must start at least ${this.config.napStartOffset} hours after flight day wake time and end at least ${this.config.napEndOffset} hours before arrival day bed time`,
				)
			}

			// 2c) A nap length of 4 hours must start at least 9 hours after flight day wake time and end at least 10 hours before arrival day bed time
			if (
				this.napLength === this.config.naps[2].length &&
				(napResultData.napStartOffset < this.config.napStartOffset ||
					napResultData.napEndOffset < this.config.napEndOffset)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`A nap length of ${this.config.naps[2].length} hours must start at least ${this.config.napStartOffset} hours after flight day wake time and end at least ${this.config.napEndOffset} hours before arrival day bed time`,
				)
			}

			// 2d) A nap length of 6 hours must start at least 12 hours after flight day wake time and end at least 12 hours before arrival day bed time
			if (
				this.napLength === this.config.naps[3].length &&
				(napResultData.napStartOffset < this.config.napStartOffset ||
					napResultData.napEndOffset < this.config.napEndOffset)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`A nap length of ${this.config.naps[3].length} hours must start at least ${this.config.napStartOffset} hours after flight day wake time and end at least ${this.config.napEndOffset} hours before arrival day bed time`,
				)
			}

			// 2e) A nap length of 8 hours must start at least 14 hours after flight day wake time and end at least 12 hours before arrival day bed time
			if (
				this.napLength === this.config.naps[4].length &&
				(napResultData.napStartOffset < this.config.napStartOffset ||
					napResultData.napEndOffset < this.config.napEndOffset)
			) {
				napResultData.napUnallowed = true
				napResultData.unallowedReasons.push(
					`A nap length of ${this.config.naps[4].length} hours must start at least ${this.config.napStartOffset} hours after flight day wake time and end at least ${this.config.napEndOffset} hours before arrival day bed time`,
				)
			}
			// 3) The traveler must not have a time period of more than 20 hours without sleep
		} else if (this.totalWakefulness > this.config.maxWakefulness) {
			napResultData.napUnallowed = true
			napResultData.unallowedReasons.push(
				`The traveler must not have a time period of more than ${this.config.maxWakefulness} hours without sleep`,
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
