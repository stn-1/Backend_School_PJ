// middleware/validate.js
export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Invalid request data",
        details: error.details.map((d) => d.message),
      });
    }

    if (property === "query" || property === "params") {
      Object.assign(req[property], value); // ✅
    } else {
      req[property] = value;
    }

    next();
  };
};
