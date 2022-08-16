const enableCors = (app, domain) => {
  app.all("*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", domain);
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
    if (req.method.toLowerCase() == 'options') {
      res.send(200);
    } else {
      next();
    }
  });
};

module.exports = {
  enableCors
};
