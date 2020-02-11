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

app.listen(3002, () => console.log('Listening on port 3002'));