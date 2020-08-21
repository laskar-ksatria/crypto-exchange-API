const errValidator = (err) => {
    let errList = [];
    for (let e in err.errors) {
      errList.push(err.errors[e].message);
    }
    return errList.join(", ");
  };
  
  module.exports = (err, req, res, next) => {
    let status = err.status || 500;
    let message = err.message || "Internal Server Error";
  
    if (err.name === "ValidationError") {
      message = errValidator(err);
      status = 400;
    } else if (
      err.message === "Returned error: insufficient funds for gas * price + value"
    ) {
      message = "insufficient funds for gas * price + value";
      status = 500;
    }
    res.status(status).json({ message, status });
  };