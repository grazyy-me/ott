// From hagopj13/node-express-boilerplate (MIT)
const pick = (object, keys) =>
  keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});

export default pick;
