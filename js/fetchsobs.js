if (typeof NMSS === 'undefined') {
  NMSS = {}
}

NMSS.fetchSobs = function() {
  $.get(
    '/r/NMSSdb.json',
    {
      t: 'month',
      show: 'all',
      limit: 50
    },
    function (data) {
      NMSS.sobsList = $.map(data.data.children, function(x) { return {fullname: x.data['title'].split(" ")[0], score: x.data['score']} })
      NMSS.sobsTime = Date.now()
      NMSS.sobs = {}

      $(NMSS.sobsList).each(function(index, sob) {
        NMSS.sobs[sob.fullname] = sob.score
      })

      localStorage.setItem('sobs', JSON.stringify(NMSS.sobs))
      localStorage.setItem('sobsTime', JSON.stringify(NMSS.sobsTime))
    }
  )
  .fail(function(jqXhr, textStatus, errorThrown) {
    console.log(errorThrown)
  })
}

NMSS.fetchSobs()
