import Joi from "joi";
import sanitizeHtml from "sanitize-html";
//phần này có tác dụng làm sạch mã độc bằng sanitize-html
export const objectId = Joi.string().hex().length(24);

export const cleanText = (value, helpers) => {
  const clean = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return clean;
};
