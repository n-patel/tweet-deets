# tweet-deets
A basic webserver that accepts a tweet ID and returns the content of the thread and some user info.

# Usage
Use the route `/tweet/text?id=<ID>`, providing the id of the tweet (`https://twitter.com/<account>/status/<ID>`).
The server will respond with JSON containing the tweet text and some basic user information (@username, name, bio), or an error (invalid ID, invalid authentication, etc).  If the tweet is a thread (i.e. the author replied to their own tweet), the entire thread text will be stitched together.

Provide the following headers with a request to `/tweet/text`:
- `server_password` (must match the string provided in `secrets.js`)
- `consumer_key` (from your [Twitter API dashboard](https://developer.twitter.com/en/portal/dashboard))
- `consumer_secret` (from your [Twitter API dashboard](https://developer.twitter.com/en/portal/dashboard))

# Threads
If you provide a parent tweet (the first tweet in a thread), the entire thread will be captured.  Unfortunately, due to limitations on the Twitter API, child tweets older than 7 days will not be captured.

If you provide a child tweet, every tweet above it in the same thread will be captured. (the 7 day limit is not applicable in this case)

# Notes
No guarantees about safety are made (given that I threw this together in a couple of hours and is only meant for personal use).

No guarantees about code quality either... (see above)
