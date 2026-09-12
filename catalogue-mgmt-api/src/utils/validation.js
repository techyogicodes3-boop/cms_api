const fieldLabels = {
  name: "Name",
  email: "Email address",
  mobile: "Mobile number",
  message: "Message",
  subject: "Subject",
  "customer.name": "Customer name",
  "customer.email": "Email address",
  "customer.phone": "Phone number",
  "customer.streetAddress": "Street address",
  "customer.city": "City",
  "customer.state": "State",
  "customer.zipcode": "PIN code",
  phone: "Phone number",
  "address.streetAddress": "Street address",
  "address.city": "City",
  "address.state": "State",
  "address.zipcode": "PIN code",
};

function validationMessage(error) {
  const detail = error?.details?.[0];
  if (!detail) return "Please check the submitted form.";

  const path = detail.path.join(".");
  const label = fieldLabels[path] || detail.context?.label || "Field";
  const limit = detail.context?.limit;

  if (["any.required", "string.empty"].includes(detail.type)) return `${label} is required.`;
  if (detail.type === "string.email") return "Enter a valid email address.";
  if (detail.type === "string.min") return `${label} must be at least ${limit} characters.`;
  if (detail.type === "string.max") return `${label} must not exceed ${limit} characters.`;
  if (detail.type === "array.min") return "Your cart must contain at least one product.";
  if (detail.type === "array.max") return `Your cart cannot contain more than ${limit} products.`;
  if (detail.type === "string.pattern.base") {
    if (["mobile", "customer.phone", "phone"].includes(path)) return "Enter a valid 10-digit Indian mobile number.";
    if (["customer.zipcode", "address.zipcode"].includes(path)) return "Enter a valid 6-digit PIN code.";
    return `${label} contains invalid characters.`;
  }
  if (detail.type === "object.unknown") return `${label} is not an accepted field.`;
  return detail.message.replaceAll('"', "");
}

function validationFailAction(request, h, error) {
  return h.response({ success: false, message: validationMessage(error) }).code(400).takeover();
}

module.exports = { validationFailAction, validationMessage };
