NMSS.process = function(modhash) {
	NMSS.modhash = modhash || NMSS.modhash
	NMSS.loggedIn = $('body').hasClass('loggedin')

	if (NMSS.settings.enabled) {
		$('body').addClass('nmssEnabled')
		$('body').addClass('nmssProcessed')

		if ($('body').hasClass('listing-page')) {
			NMSS.processPosts()
		}
		else if (NMSS.loggedIn && $('body').hasClass('comments-page')) {
			var isSubreddit = window.location.pathname.match(/^\/r\/([A-Za-z0-9_]+)\/comments/)
			var isEnabledSub = (isSubreddit && (NMSS.settings.subs.indexOf('/r/'+isSubreddit[1]) >= 0))
			if (isEnabledSub) {
				NMSS.processSinglePost()
			}
		}
	}

	if ($('#RESDropdownOptions') && !$('#NMSSToggleRESDropdown').length) {
		NMSS.addRESToggle()
	}
}

NMSS.processPosts = function() {
	var posts = $('div.linklisting div.entry:not(.sobTagged)')
	var isSubreddit = window.location.pathname.match(/^\/r\/([A-Za-z0-9_]+)($|\/)/)
	var isEnabledSub = (isSubreddit && (NMSS.settings.subs.indexOf('/r/'+isSubreddit[1]) >= 0))

	posts.each(function() {
		var thing = $(this).parent('div.thing')
		var fullname = thing.attr('data-fullname')

		if (NMSS.flagged[fullname] || (NMSS.sobs && (NMSS.sobs[fullname] !== undefined) && (NMSS.sobs[fullname] >= NMSS.settings.threshold))) {
			NMSS.hidePost(thing)
		}

		if (NMSS.loggedIn) {
			var addLink = isEnabledSub

			if (!isEnabledSub) {
				var subreddit = $(this).children('p.tagline').children('a.subreddit').text()
				addLink = (NMSS.settings.subs.indexOf(subreddit) >= 0)
			}

			if (addLink) {
				NMSS.addFlagLink(this, fullname)
			}
		}
	})
}

NMSS.processSinglePost = function() {
	var thing = $('div.linklisting div.thing')
	var fullname = thing.attr('data-fullname')
	var entry = thing.find('div.entry:not(.sobTagged)')

	NMSS.addFlagLink(entry, fullname)
}

NMSS.addFlagLink = function(obj, fullname) {
	var flagLink = $('<li />').append(
		$('<a href="#" class="flagSobStory">'+(NMSS.flagged[fullname] ? 'un' : '')+'sob</a>')
			.click(NMSS.clickedFlag)
	)
	$(obj).addClass('sobTagged').children('ul.buttons').append(flagLink)
}

NMSS.clickedFlag = function(event) {
	var thing = $(this).parents("div.thing")
	var fullname = thing.attr('data-fullname')
	var title = thing.find('p.title a.title').text()

	var originalURL = thing.find('ul.buttons a.comments').attr('href')
	var partialURL = originalURL.match(/(\/r\/([A-Za-z0-9_]+)\/comments\/(.+)\/)/)
	var newURL = 'http://www.reddit.com' + partialURL[0]

	event.preventDefault()

	if (NMSS.flagged[fullname]) {
		NMSS.updateFlagText(fullname, 'unflagging')
		NMSS.votePost(NMSS.flagged[fullname], 0, function(ok, data) {
			NMSS.updateFlagText(fullname, ok ? 'unflagged' : 'flagged')
			NMSS.LOG('[NMSS] unflag '+(ok ? 'OK' : 'ERROR')+': '+fullname)
			if (ok) {
				delete NMSS.flagged[fullname]
				NMSS.saveFlagged()
			}
		})
	}
	else {
		NMSS.updateFlagText(fullname, 'flagging')

		$.post(
			'/api/submit.json',
			{
				title: title,
				url: newURL,
				kind: 'link',
				sendreplies: false,
				sr: NMSS.settings.srdb,
				uh: NMSS.modhash
			},
			function(data, textStatus, jQxhr) {
				var resp = data.jquery

				if (resp && resp[16]) {
					var match = resp[16][3][0].match(/\/r\/([A-Za-z0-9_]+)\/comments\/([^\/]+)\//)
					var postID = 't3_'+match[2]

					if (resp[18] && (resp[18][3][0] === ".error.ALREADY_SUB.field-url")) {
						NMSS.LOG('[NMSS] submission exists: '+fullname)
						if (match) {
							NMSS.votePost(postID, 1, function(ok, data) {
								NMSS.updateFlagText(fullname, ok ? 'flagged' : 'unflagged')
								NMSS.LOG('[NMSS] flag (upvote) '+(ok ? 'OK' : 'ERROR')+': '+fullname)
								if (ok) {
									NMSS.flagged[fullname] = postID
									NMSS.saveFlagged()
								}
							})
						}
					}
					else {
						NMSS.updateFlagText(fullname, 'flagged')
						NMSS.flagged[fullname] = postID
						NMSS.saveFlagged()
						NMSS.LOG('[NMSS] flag (submit) OK: '+fullname)
					}
				}
				else {
					NMSS.updateFlagText(fullname, 'unflagged')
					NMSS.LOG('[NMSS] flag (submit) ERROR: '+fullname)
				}
			}
		)
		.fail(function(jqXhr, textStatus, errorThrown) {
			NMSS.LOG(errorThrown)
		})
	}

	if (NMSS.settings.downvote) {
		NMSS.votePost(fullname, -1, function(ok, data) {
			NMSS.LOG('[NMSS] downvote '+(ok ? 'OK' : 'ERROR')+': '+fullname)
		})
	}
}

NMSS.votePost = function(fullname, dir, callback) {
	$.post(
		'/api/vote.json',
		{
			id: fullname,
			dir: dir,
			uh: NMSS.modhash
		},
		function(data, textStatus, jQxhr) {
			if (data.error) {
				callback(false, data)
				// NMSS.LOG(data)
			}
			else {
				callback(true, data)
				// NMSS.LOG(msgSuccess)
			}
		}
	)
	.fail(function(jqXhr, textStatus, errorThrown) {
		callback(false, errorThrown)
		NMSS.LOG(errorThrown)
	})
}

NMSS.updateFlagText = function(fullname, op) {
	var post = $('div.thing.id-'+fullname)
	var flag = post.find('div.entry > ul.buttons > li > a.flagSobStory')[0]

	if (op == 'flagging') {
		flag.innerText = 'sobbing...'
	}
	else if (op == 'unflagging') {
		flag.innerText = 'unsobbing...'
	}
	else if (op == 'flagged') {
		flag.innerText = 'unsob'
	}
	else if (op == 'unflagged') {
		flag.innerText = 'sob'
	}
}

NMSS.hidePost = function(what) {
	var obj, fullname

	if ($.type(what) === 'string') {
		fullname = what
		thing = $('div.thing.id-'+fullname)
	}
	else {
		thing = what
		fullname = what.attr('data-fullname')
	}

	thing.addClass('flaggedSobStory')
}

NMSS.toggleNMSSEnabled = function() {
	NMSS.settings.enabled = !NMSS.settings.enabled
	NMSS.saveSettings()
	$('body').toggleClass('nmssEnabled')

	if (!$('body').hasClass('nmssProcessed')) {
		NMSS.process()
	}
}

NMSS.addRESToggle = function() {
	var li = $('<li title="Toggle Sob Story Filter" id="NMSSToggleRESDropdown">sob story filter</li>')
		.click(function() {
			NMSS.toggleNMSSEnabled()
			$('#sobstorySwitchToggle').toggleClass('enabled')
		})

	var div = $('<div id="sobstorySwitchToggle" class="toggleButton"></div>')
		.append($('<span class="toggleOn">on</span>'))
		.append($('<span class="toggleOff">off</span>'))

	if (NMSS.settings.enabled) {
		div.addClass('enabled')
	}

	li.append(div)
	$('#RESDropdownOptions').append(li)
}

// if the user has RES with "never ending reddit" enabled then we want to detect
// when new posts are loaded
window.addEventListener("neverEndingLoad", function() {
	setTimeout(NMSS.processPosts, 100)
}, false)

// listen to the event we will create to fetch the modhash
window.addEventListener("modhashDispatch", function(event) {
	NMSS.process(event.detail)
}, false)

// inject a script to the site to be able to access its objects (mainly the modhash)
var script = document.createElement('script')
script.src = chrome.extension.getURL('/js/inject.js');
(document.head||document.documentElement||document.body).appendChild(script)
