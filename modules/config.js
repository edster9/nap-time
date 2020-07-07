const config = {
	// number of hours to avoid a nap before a flight take off
	hoursAllowedBeforeTakeOff: 4.0,
	// number of hours to avoid a nap after a flight take off
	hoursAllowedAfterTakeOff: 1.0,
	// number of hours to avoid a nap before flight landing
	hoursAllowedBeforeLanding: 1.0,
	// number of hours to avoid a nap after flight landing
	hoursAllowedAfterLanding: 2.0,
	// number of incremental hours to offset a nap when attempting to move a nap forward to back
	napOffsetAttempt: 0.25,
	// milliseconds in one day
	msDay: 3600000,
	maxWakefulness: 20,
	// nap lengths vs. wakefulness
	naps: [
		{
			length: 1,
			minWakefulness: 20,
			maxWakefulness: 24,
			napStartOffset: 4,
			napEndOffset: 6,
		},
		{
			length: 2,
			minWakefulness: 24,
			maxWakefulness: 28,
			napStartOffset: 6,
			napEndOffset: 8,
		},
		{
			length: 4,
			minWakefulness: 28,
			maxWakefulness: 36,
			napStartOffset: 9,
			napEndOffset: 10,
		},
		{
			length: 6,
			minWakefulness: 36,
			maxWakefulness: 42,
			napStartOffset: 12,
			napEndOffset: 12,
		},
		{
			length: 8,
			minWakefulness: 42,
			maxWakefulness: 0,
			napStartOffset: 14,
			napEndOffset: 12,
		},
	],
}

module.exports = config
