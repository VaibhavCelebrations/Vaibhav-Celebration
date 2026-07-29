"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.param = param;
exports.queryString = queryString;
const errors_1 = require("./errors");
/** Express 5 types params as string | string[] | undefined — normalize to string */
function param(req, name) {
    const value = req.params[name];
    const str = Array.isArray(value) ? value[0] : value;
    if (!str)
        throw new errors_1.ValidationError(`Missing path param: ${name}`);
    return str;
}
function queryString(req, name) {
    const value = req.query[name];
    if (value == null)
        return undefined;
    if (Array.isArray(value))
        return String(value[0]);
    if (typeof value === "object")
        return undefined;
    return String(value);
}
//# sourceMappingURL=params.js.map