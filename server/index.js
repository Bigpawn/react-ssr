const express = require("express");
const fs = require("fs");
const path = require("path");
const ServerRenderer = require("./renderer");
const app = express();

const isProd = process.env.NODE_ENV === "production";

let renderer;
let readyPromise;
if (isProd) {
  // 静态资源映射到dist路径下
  app.use("/dist", express.static(path.join(__dirname, "../dist")));

  let bundle = require("../dist/server-bundle.json");
  let template = fs.readFileSync("./dist/index.html", "utf-8");
  renderer = new ServerRenderer(bundle, template);
} else {
  readyPromise = require("./dev-server")(app, (bundle, template) => {
    renderer = new ServerRenderer(bundle, template);
  });
}

app.use("/public", express.static(path.join(__dirname, "../public")));

/* eslint-disable no-console */
const render = (req, res) => {
  console.log("======enter server======");
  console.log("visit url: " + req.url);

  // 此对象会合并然后传给服务端路由，不需要可不传
  const context = {};

  renderer.renderToString(req, context).then(({error, html}) => {
    if (error) {
      if (error.url) {
        res.redirect(error.url);
      } else if (error.code) {
        res.status(error.code).send("error code：" + error.code);
      }
    }
    res.send(html);
  }).catch(error => {
    console.log(error);
    res.status(500).send("Internal server error");
  });
}

app.get("*", isProd ? render : (req, res) => {
  // 等待客户端和服务端打包完成后进行render
	readyPromise.then(() => render(req, res));
});

app.listen(3000, () => {
  console.log("Your app is running");
});
