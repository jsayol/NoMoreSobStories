NMSS = {}
NMSS.DEBUG = false
NMSS.LOG = NMSS.DEBUG ? console.log.bind(console) : function() {}

NMSS.init = function() {
	NMSS.loadSettings()
	NMSS.loadFlagged()
	NMSS.loadSobs()
}

NMSS.loadSettings = function() {
	NMSS.settings = {
		enabled: true,
		threshold: 50,
		fetchInterval: 300, // in seconds (300 seconds = 5 minutes)
		checkCaptchaInterval: 300, // in seconds (300 seconds = 5 minutes)
		downvote: false,
		srdb: 'NoMoreSobStories',
		subs: ['/r/pics']
	}

	var settingsStorage = localStorage.getItem('settings')
	if (settingsStorage) {
		$.extend(true, NMSS.settings, $.parseJSON(settingsStorage))
	}

	NMSS.saveSettings()
}

NMSS.saveSettings = function() {
	localStorage.setItem('settings', JSON.stringify(NMSS.settings))
}

NMSS.loadFlagged = function() {
	var flagged = localStorage.getItem('flagged')

	if (flagged === null) {
		NMSS.flagged = {}
		NMSS.saveFlagged()
	}
	else {
		NMSS.flagged = $.parseJSON(flagged)
	}
}

NMSS.saveFlagged = function() {
	localStorage.setItem('flagged', JSON.stringify(NMSS.flagged))
}

NMSS.loadSobs = function() {
	NMSS.sobs = $.parseJSON(localStorage.getItem('sobs'))
	NMSS.sobsTime = localStorage.getItem('sobsTime')

	if (!NMSS.sobs || !NMSS.sobsTime || ((Date.now()-NMSS.sobsTime) >= NMSS.settings.fetchInterval*1000)) {
		NMSS.LOG('[NMSS] fetching sob stories...')
		$.get(
			'/r/'+NMSS.settings.srdb+'/top.json',
			{
				t: 'month',
				show: 'all',
				limit: 50
			},
			function (data) {
				NMSS.sobs = {}
				NMSS.sobsTime = Date.now()

				$(data.data.children).each(function(index, child) {
					var match = child.data.url.match(/\/r\/([A-Za-z0-9_]+)\/comments\/([^\/]+)\//)
					if (match && match[2]) {
						NMSS.sobs['t3_'+match[2]] = child.data.score
					}
				})

				localStorage.setItem('sobs', JSON.stringify(NMSS.sobs))
				localStorage.setItem('sobsTime', JSON.stringify(NMSS.sobsTime))

				NMSS.LOG('[NMSS] fetched '+Object.keys(NMSS.sobs).length+' sob stories')
			}
		)
		.fail(function(jqXhr, textStatus, errorThrown) {
			NMSS.LOG(errorThrown)
		})
	}
	else {
		NMSS.LOG('[NMSS] Using '+Object.keys(NMSS.sobs).length+' cached sob stories')
	}
}

NMSS.init()
