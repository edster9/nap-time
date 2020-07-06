class NapResult {
	constructor(data) {
		this.data = data
	}

	printDetails(fullDetails = false) {
		console.log('--- Nap Details ---')
		if (fullDetails) {
			// console.log('time now', this.data.timeNow)
			console.log('flightDepartTimeDT', this.data.inputs.flightDepartTimeDT)
			console.log('flightArrivalTimeDT', this.data.inputs.flightArrivalTimeDT)
			console.log('usualWakeTimeDT', this.data.inputs.usualWakeTimeDT)
			console.log('usualBedTimeDT', this.data.inputs.usualBedTimeDT)
			console.log('flightDayWakeTimeDT', this.data.inputs.flightDayWakeTimeDT)
			console.log('preferredWakeTimeDT', this.data.inputs.preferredWakeTimeDT)
			console.log('preferredBedTimeDT', this.data.inputs.preferredBedTimeDT)
			console.log('arrivalDayBedTimeDT', this.data.inputs.arrivalDayBedTimeDT)

			// console.log('time now', this.data.timeNow.utc())
			// console.log('flightDepartTimeDT', this.data.inputs.flightDepartTimeDT.utc())
			// console.log('flightArrivalTimeDT', this.data.inputs.flightArrivalTimeDT.utc())
			// console.log('usualWakeTimeDT', this.data.inputs.usualWakeTimeDT.utc())
			// console.log('usualBedTimeDT', this.data.inputs.usualBedTimeDT.utc())
			// console.log('flightDayWakeTimeDT', this.data.inputs.flightDayWakeTimeDT.utc())
			// console.log('preferredWakeTimeDT', this.data.inputs.preferredWakeTimeDT.utc())
			// console.log('preferredBedTimeDT', this.data.inputs.preferredBedTimeDT.utc())
			// console.log('arrivalDayBedTimeDT', this.data.inputs.arrivalDayBedTimeDT.utc())
			console.log('----------')
		}

		if (this.data.napUnallowed) {
			console.log('NAP IS UNALLOWED', this.data.unallowedReasons)
		} else {
			console.log('NAP IS ALLOWED')
		}

		console.log('flight hours', this.data.flightHours)
		console.log('total wakefulness hours', this.data.totalWakefulness)
		console.log('wakeup time', this.data.wakeupTimeDT)
		console.log('bed time', this.data.bedTimeDT)
		console.log('nap length', this.data.napLength)
		console.log('hours to start nap after take off', this.data.napAfterTakeOff)
		console.log('hours to end nap before arrival', this.data.napBeforeArrival)
		console.log('hours to start nap from wake up', this.data.napStartOffset)
		console.log('hours to end nap before sleep', this.data.napEndOffset)
		console.log('nap start time', this.data.napStartDT)
		console.log('nap end time', this.data.napEndDT)
	}
}

NapResult.prototype.toString = function () {
	let output = this.data.modified
		? 'Yes, the nap can be placed by modifying the nap time'
		: 'Yes, the nap can be placed without modifying the nap time'

	const napStart = this.data.napStartDT.format('HH:mm')
	const napEnd = this.data.napEndDT.format('HH:mm')

	let homeTZOffset = this.data.napStartDT.utcOffset() / 60

	this.data.napStartDT.utcOffset(this.data.inputs.destTimeZone)
	const napStartDestTZ = this.data.napStartDT.format('HH:mm')

	let destTZOffset = this.data.napStartDT.utcOffset() / 60

	if (homeTZOffset > -1) {
		homeTZOffset = `+${homeTZOffset}`
	}

	if (destTZOffset > -1) {
		destTZOffset = `+${destTZOffset}`
	}

	this.data.napEndDT.utcOffset(this.data.inputs.destTimeZone)
	const napEndDestTZ = this.data.napEndDT.format('HH:mm')

	output += `\nNap Start Time: ${napStart} GMT${homeTZOffset} / ${napStartDestTZ} GMT${destTZOffset}`
	output += `\nNap End Time: ${napEnd} GMT${homeTZOffset} / ${napEndDestTZ} GMT${destTZOffset}`

	if (this.data.modified) {
		const napOriginalStart = this.data.napOriginalStartDT.format('HH:mm')
		const napOriginalEnd = this.data.napOriginalEndDT.format('HH:mm')

		output += `\nOriginal Nap Start Time: ${napOriginalStart} GMT${homeTZOffset} / ${napStartDestTZ} GMT${destTZOffset}`
		output += `\nOriginal Nap End Time: ${napOriginalEnd} GMT${homeTZOffset} / ${napEndDestTZ} GMT${destTZOffset}`
	}

	this.data.napStartDT.utcOffset(this.data.inputs.homeTimeZone)
	this.data.napEndDT.utcOffset(this.data.inputs.homeTimeZone)

	return output
}

module.exports = NapResult
