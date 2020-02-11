const fs = require('fs');
const path = require('path');
const express = require('express');
const flexjson = require('jsonflex')();
const app = express();
app.use(express.static('www'));
app.use(flexjson);

app.get('/songs', (req, res) => {
  let songs = path.join(__dirname, 'www', 'songs');
  let paths = fs.readdirSync(songs);
  res.json(paths.map(x => fs.readFileSync(path.join(songs, x), 'utf-8')));
});

app.get('/gigs', (req, res) => {
  let gigs = path.join(__dirname, 'www', 'json');
  let paths = fs.readdirSync(gigs);
  res.json(paths.map(x => ({ title: JSON.parse(fs.readFileSync(path.join(gigs, x))).title, gig: x.slice(0, -5) }), 'utf-8'));
});

app.listen(3002, () => console.log('Listening on port 3002'));