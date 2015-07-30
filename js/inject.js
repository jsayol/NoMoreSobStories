(function() {
	// create and fire an event to send the "modhash" to the extension
	var evt = document.createEvent("CustomEvent");
	evt.initCustomEvent("modhashDispatch", true, true, r.config.modhash);
	document.dispatchEvent(evt);
})()
