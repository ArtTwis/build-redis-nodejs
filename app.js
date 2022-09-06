const express = require('express');

const app = express();

const fetch = require('node-fetch');

const PORT = process.env.PORT || 3002;

const REDIS_PORT = process.env.PORT || 6379;

// ############ REDIS #############

const redis = require('redis');

const redisClient = redis.createClient(REDIS_PORT, '127.0.0.1');
/*
The above code connects to localhost on port 6379. To connect to a different host or port, use a connection string in the format redis[s]://[[username][:password]@][host][:port][/db-number]:

  createClient({
    url: 'redis://alice:foobared@awesome.redis.server:6380'
  });
*/

// Connect to Redis
redisClient.connect();

// Check is Redis connected
redisClient.on('connect', (err) => {
  if (err) {
    console.log('Connect to redis failed!');
  }

  console.log('Connected to redis!');
});

// Cache Middleware
function cache(req, res, next) {
  const { username } = req.params;

  redisClient.get(username, (err, data) => {
    if (err) throw err;

    if (data) {
      res.send(setResponse(username, data));
    } else {
      next();
    }
  });
}

// ############ ROUTES #############

app.get('/repos/:username', cache, getRepos);

// ############ Functions #############

async function getRepos(req, res, next) {
  try {
    console.log('Fetching Data.....');

    const { username } = req.params;

    const response = await fetch(`https://api.github.com/users/${username}`);

    const data = await response.json();

    const reposCount = data.public_repos;

    // set data to Redis
    redisClient.set(username, reposCount);

    // return res.status(200).json({
    //   status: 'success',
    //   data,
    // });

    res.send(setResponse(username, reposCount));
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 'failed',
      err: error,
    });
  }
}

function setResponse(username, repos) {
  return `<h2>${username} has ${repos} repos on Github.</h2>`;
}

// ############ LISTENING SERVER #############

app.listen(PORT, () => {
  console.log(`App is listening on port ${PORT}!`);
});
