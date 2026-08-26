export function createSignupPayload(inputs) {
  return {
    firstname: inputs.firstname,
    lastname: inputs.lastname,
    email: inputs.email,
    password: inputs.password,
    ...(inputs.phone ? { phone: inputs.phone } : {}),
  };
}
