// From hagopj13/node-express-boilerplate (MIT)
const allRoles = {
  user: [],
  admin: ['getUsers', 'manageUsers'],
};

export const roles = Object.keys(allRoles);
export const roleRights = new Map(Object.entries(allRoles));
