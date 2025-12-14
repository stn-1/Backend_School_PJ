// middleware/validate.js
export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true, // ❗ xóa field thừa → chống injection
    });

    if (error) {
      return res.status(400).json({
        message: "Invalid request data",
        details: error.details.map((d) => d.message),
      });
    }

    req[property] = value;
    next();
  };
};
