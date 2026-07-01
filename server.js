require('dotenv').config({ path: './.env' });

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || process.env.npm_config_port || '3000', 10);
const hostname = '0.0.0.0';

app.prepare().then(() => {
  createServer((req, res) => handle(req, res, parse(req.url, true))).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Dishkin ready on http://${hostname}:${port}`);
  });
});
