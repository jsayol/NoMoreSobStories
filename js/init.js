NMSS = {}
NMSS.DEBUG = false
NMSS.LOG = NMSS.DEBUG ? console.log.bind(console) : function() {}

NMSS.init = function() {
	NMSS.loadSettings()
	NMSS.loadFlagged()

  NMSS.sobsTime = localStorage.getItem('sobsTime')

  if (!NMSS.sobsTime || ((Date.now()-NMSS.sobsTime) >= NMSS.settings.fetchInterval*1000)) {
    NMSS.fetchSobs()
  }
  else {
    NMSS.sobs = $.parseJSON(localStorage.getItem('sobs'))
    NMSS.LOG('[NMSS] using '+Object.keys(NMSS.sobs).length+' cached sob stories')
  }
}

NMSS.loadSettings = function() {
	NMSS.settings = {
		enabled: true,
		threshold: 100,
    fetchInterval: 300, // in seconds (300 seconds = 5 minutes)
		downvote: false,
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

NMSS.fetchSobs = function() {
  NMSS.LOG('[NMSS] fetching sob stories...')
  $.get(
    '/r/NMSSdb.json',
    {
      t: 'month',
      show: 'all',
      limit: 50
    },
    function (data) {
      var sobsList = $.map(data.data.children, function(x) { return {fullname: x.data['title'].split(" ")[0], score: x.data['score']} })

      NMSS.sobs = {}
      NMSS.sobsTime = Date.now()

      $(sobsList).each(function(index, sob) {
        NMSS.sobs[sob.fullname] = sob.score
      })

      localStorage.setItem('sobs', JSON.stringify(NMSS.sobs))
      localStorage.setItem('sobsTime', JSON.stringify(NMSS.sobsTime))

      NMSS.LOG('[NMSS] fetched '+sobsList.length+' sob stories')
    }
  )
  .fail(function(jqXhr, textStatus, errorThrown) {
    NMSS.LOG(errorThrown)
  })
}

NMSS.init()
