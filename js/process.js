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
	NMSS.flagPost(thing)
}

NMSS.flagPost = function(thing, captcha) {
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

		var submitPOST = {
			title: title,
			url: newURL,
			kind: 'link',
			sendreplies: false,
			sr: NMSS.settings.srdb,
			uh: NMSS.modhash
		}

		if (captcha) {
			submitPOST.iden = captcha.iden
			submitPOST.captcha = captcha.text
		}

		$.post(
			'/api/submit.json',
			submitPOST,
			function(data, textStatus, jQxhr) {
				var resp = data.jquery
				var isError1 = resp && resp[18] && resp[18][3][0]
				var isError2 = resp && resp[26] && resp[26][3][0]

				if ((isError1 !== undefined) && isError1.startsWith('.error.')) {
					if (isError1 === '.error.BAD_CAPTCHA.field-captcha') {
						NMSS.LOG('[NMSS] CAPTCHA required or incorrect: '+fullname)
						NMSS.showCAPTCHA(resp[16][3][0],
							function(captcha) {
								NMSS.flagPost(thing, captcha)
							},
							function() {
								NMSS.updateFlagText(fullname, 'unflagged')
							}
						)
					}
					else if (isError1 === '.error.ALREADY_SUB.field-url') {
						NMSS.LOG('[NMSS] submission exists: '+fullname)
						var match = resp[16][3][0].match(/\/r\/([A-Za-z0-9_]+)\/comments\/([^\/]+)\//)
						if (match && (match[2] !== null)) {
							var postID = 't3_'+match[2]
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
					// else if (isError1 === '.error.RATELIMIT.field-ratelimit') {
					// }
					else {
						NMSS.LOG('[NMSS] flag (submit) ERROR: '+fullname)
						$.prompt('reddit said:<br />'+resp[22][3][0], {title: 'Oops', persistent: false})
						NMSS.updateFlagText(fullname, 'unflagged')
					}
				}
				else if ((isError2 !== undefined) && isError2.startsWith('.error.')) {
					// if (isError2 === '.error.QUOTA_FILLED') {
					// }
					// else {
						NMSS.LOG('[NMSS] flag (submit) ERROR: '+fullname)
						$.prompt('reddit said:<br />'+resp[30][3][0], {title: 'Oops', persistent: false})
						NMSS.updateFlagText(fullname, 'unflagged')
					// }
				}
				else {
					if (resp && resp[16]) {
						var match = resp[16][3][0].match(/\/r\/([A-Za-z0-9_]+)\/comments\/([^\/]+)\//)
						NMSS.updateFlagText(fullname, 'flagged')
						NMSS.flagged[fullname] = 't3_'+match[2]
						NMSS.saveFlagged()
						NMSS.LOG('[NMSS] flag (submit) OK: '+fullname)
					}
					else {
						NMSS.updateFlagText(fullname, 'unflagged')
						NMSS.LOG('[NMSS] flag (submit) ERROR: '+fullname)
					}
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

NMSS.showCAPTCHA = function(iden, callback, cbCancel) {
	$.prompt.close()

	var msg =  '\
		<div>\
		  <div>\
		    <div style="float: left; width: 55%;">Enter the text you see in the image:</div>\
		    <div style="float: left; width: 45%;"><input type="text" name="text" class="nmssCaptchaText" value=""></div>\
		  </div>\
		  <div>\
		    <div style="float: left; width: 55%;">&nbsp;</div>\
		    <div style="float: left; width: 45%; margin-top: 5px"><img class="nmssCaptchaImg" src="/captcha/'+iden+'.png'+'" /></div>\
		  </div>\
		</div>\
		<input type="hidden" name="iden" class="nmssCaptchaIden" value="'+iden+'">\
	'

	var options = {
		title: 'reddit wants to know if you\'re human',
		buttons: { 'get new image': -1, 'cancel': 0, 'continue': 1 },
		focus: 'input[name="text"]',
		defaultButton: 2,
		persistent: false,
		close: function(e,v,m,f) {
			if ((v === undefined) && cbCancel) {
				cbCancel()
			}
		},
		submit: function(e,v,m,f) {
			if (v === -1) {
				e.preventDefault()
				var el = $(this)
				$.post(
					'/api/new_captcha.json',
					function(data) {
						if (data && data.jquery && data.jquery[11]) {
							var newIden = data.jquery[11][3][0]
							el.find('input.nmssCaptchaIden').attr('value', newIden)
							el.find('img.nmssCaptchaImg').attr('src', '/captcha/'+newIden+'.png')
							el.find('input.nmssCaptchaText').focus()
						}
					}
				)
			}
			else if (v === 0) {
				cbCancel && cbCancel()
			}
			else {
				callback && callback({
					iden: f.iden,
					text: f.text
				})
			}
		}
	}

	$.prompt(msg, options)
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
