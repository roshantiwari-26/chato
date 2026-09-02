const errorMiddleware = (err, req, res, next) => {
  console.log(err);
  res.status(err.statusCode || 500).json({
    message: statusCode === 500 ? "Internal server error" : err.message,
  });
};
module.exports = errorMiddleware;
