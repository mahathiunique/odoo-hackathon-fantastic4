const { text, add, failIfInvalid, validateStatus } = require("./validationHelpers");

const validateCategory = (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = [];
    const isCreate = req.method === "POST";
    const present = (field) => Object.prototype.hasOwnProperty.call(body, field);

    if (isCreate || present("name")) {
      body.name = text(body.name);
      if (!body.name) add(errors, "name", "Name is required");
      else if (body.name.length < 2 || body.name.length > 100)
        add(errors, "name", "Name must be between 2 and 100 characters");
    }
    if (isCreate || present("code")) {
      body.code = text(body.code)?.toUpperCase();
      if (!body.code) add(errors, "code", "Code is required");
      else if (body.code.length < 2 || body.code.length > 20)
        add(errors, "code", "Code must be between 2 and 20 characters");
      else if (!/^[A-Z0-9_-]+$/.test(body.code))
        add(errors, "code", "Code may contain only letters, numbers, hyphens and underscores");
    }
    if (present("description")) {
      body.description = text(body.description) || "";
      if (body.description.length > 500) add(errors, "description", "Description cannot exceed 500 characters");
    }
    if (isCreate || present("defaultUsefulLife")) {
      const value = Number(body.defaultUsefulLife);
      if (!Number.isInteger(value) || value < 1 || value > 600)
        add(errors, "defaultUsefulLife", "Useful life must be an integer between 1 and 600 months");
      else body.defaultUsefulLife = value;
    }
    if (present("requiresMaintenance")) {
      if (typeof body.requiresMaintenance !== "boolean")
        add(errors, "requiresMaintenance", "Requires maintenance must be Boolean");
    }
    if (present("status") && !["Active", "Inactive"].includes(body.status))
      add(errors, "status", "Status must be Active or Inactive");

    failIfInvalid(errors);
    req.body = body;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validateCategory, validateCategoryStatus: validateStatus };
