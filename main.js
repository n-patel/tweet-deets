const express = require('express')
const Twitter = require('twitter-v2')
const decode = require('unescape')
const secrets = require('./secrets')

const app = express()
const port = 3000

app.listen(port, (req, res) => {})

app.get('/', (req, res) => {
	res.send(`Online on port ${port}`)
})

app.get('/tweet/text', async (req, res) => {
	console.log(`[${new Date()}] (${req.ip})`)

	if (!req) 								return throwError('No request', res)
	if (!req.query || !req.query.id) 		return throwError('Please include a tweet ID', res)
	
	const [password, consumer_key, consumer_secret] = [req.header('server_password'), req.header('consumer_key'), req.header('consumer_secret')]

	if (password !== secrets.password) 		return throwError('Invalid server password', res, 403)
	if (!consumer_key || !consumer_secret)	return res.status(403).json({ error: 'Please provide Twitter API key and secret' })

	const client = new Twitter({
		consumer_key,
		consumer_secret,
	})

	const t = await getTweetInfo(req.query.id, client, res)

	if (!t) {
		return throwError('Could not retrieve tweet', res)
	}

	return res.json(t)
})


async function getTweetInfo(tweet_id, client, res) {
	const { thread, user } = await getThread(tweet_id, client, res)

	let text = thread.map(r => decode(r['text'])).join('\n\n')
	return { text, user }
}


async function getThread(tweet_id, client, res) {
	const { tweet, user } = await getTweet(tweet_id, client, res)

	let thread
	if (getParentId(tweet)) {
		thread = await recurseToParentTweet(tweet, [tweet], client, res)
	} else {
		thread = await searchForReplies(tweet, client, res)
	}

	if (!thread || thread.length === 0) {
		throwError('Could not retrieve thread', res)
	}

	return { thread, user }
}


async function recurseToParentTweet(current, thread, client, res) {
	if (!getParentId(current)) {
		return thread 
	} else {
		const { tweet } = await getTweet(getParentId(current), client, res)

		thread.unshift(tweet)
		return recurseToParentTweet(tweet, thread, client, res)
	}
}


async function searchForReplies(tweet, client, res) {
	const { author_id, conversation_id } = tweet

	const { data } = await client.get('tweets/search/recent', { 
		query: `conversation_id:${conversation_id} from:${author_id} to:${author_id}`,
		tweet: {
			fields: ['author_id', 'conversation_id', 'in_reply_to_user_id', 'created_at']
		},
		max_results: 50,
	})

	thread = [tweet]

	if (data) {
		data.reverse()		// results from Twitter API are returned in reverse-chronological order
		thread = thread.concat(data)
	}

	return thread
}


async function getTweet(tweet_id, client, res) {
	const { data, includes } = await client.get('tweets', { 
		ids: tweet_id,
		tweet: { fields: ['author_id', 'conversation_id', 'created_at', 'in_reply_to_user_id', 'referenced_tweets'] },
		user: { fields: ['username', 'name', 'description'] },
		expansions: ['author_id'],
	})

	if (!data || data.length == 0) {
		return throwError('Invalid tweet ID', res)
	}

	return {
		tweet: data[0],
		user: includes['users'][0],
	}
}


function getParentId(tweet) {
	const { referenced_tweets } = tweet

	if (!referenced_tweets) {
		return undefined
	}

	let replying_to_tweet

	referenced_tweets.forEach(t => {
		if (t['type'] && t['type'] === 'replied_to') {
			replying_to_tweet = t['id']
		}
	})

	if (replying_to_tweet) {
		return replying_to_tweet
	}
	
	return undefined
}


function throwError(msg, res, code=500) {
	console.log(`[${new Date()}] ERROR: ${msg}`)
	res.status(code).json({ error: msg })
}
