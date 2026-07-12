const { text, add, failIfInvalid, validateStatus } = require("./validationHelpers");

const validateDepartment = (req, res, next) => {
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
    if (present("managerName")) {
      body.managerName = text(body.managerName) || "";
      if (body.managerName.length > 100) add(errors, "managerName", "Manager name cannot exceed 100 characters");
    }
    if (isCreate || present("location")) {
      body.location = text(body.location);
      if (!body.location) add(errors, "location", "Location is required");
      else if (body.location.length > 150) add(errors, "location", "Location cannot exceed 150 characters");
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

module.exports = { validateDepartment, validateDepartmentStatus: validateStatus };
