# No More Sob Stories
Chrome extension to hide "sob stories" on reddit.

## What's a sob story?
According to google:
> **sob sto·ry**

> noun *informal*

> noun: sob story; plural noun: sob stories

> a story or explanation intended to make someone feel sympathy for the person relating it.

In practice, sob stories on reddit are those where people post a picture of their dead dog/grandma/grandpa/turtle/rock/whatever simply for the karma or the attention. The pictures tend to be rather bad and the posts only reach the front page because of the sad story in the title.

## How does it work?
The extension adds a small button on every post on /r/pics allowing the user to flag the post as a sob story.

It looks like this: https://i.imgur.com/4AOkMoS.png

Aside from that, the extension checks the posts that other users have flagged as being a sob story. When a certain threshold is reached, the post will be hidden automatically. (The threshold is 50 users right now, but that will more than like change in the future.)

Internally, the extension uses a subreddit as its shared database. When a story is flagged for the first time, the extension creates a new submission in that subreddit. Whenever someone else flags the same story, it simply gets upvoted. All this happens internally so you don't need to worry about it, though. 

## Ok, I installed it. Now what?
You won't see much difference at first, until several people start flagging posts. So go ahead and do that whenever you find an offending story :) The more users use the extension and flag posts, the better for everyone.

## What's next for the extension?
There's plenty to be added and improved. Here's a short ToDo list of things that are pending:

* Add a way to see what stories the user has flagged.
* Add an option to decide whether to completely hide a flagged story or just mark it in some way. Right now they're hidden.
* Create some sort of settings page. For now, if you're using RES I added a small toggle in the drop-down menu to enable/disable the extension. This is just temporary.
* Right now the extension only applies to /r/pics. Allow the user to decide what other subreddits to filter.
* Figure out what threshold works best.
* Allow the user to change the threshold.

If you have any other ideas on how to improve the extension please let me know! Either here or, preferably, [on github](https://github.com/jsayol/NoMoreSobStories/issues) :)
