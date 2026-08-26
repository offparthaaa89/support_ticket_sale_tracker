import {
    loginUser,
    registerUser,
    type LoginInput,
    type RegisterInput,
  } from "../../services/auth.service";
  
  interface RegisterArgs {
    input: RegisterInput;
  }
  
  interface LoginArgs {
    input: LoginInput;
  }
  
  export const mutationResolvers = {
    Mutation: {
      register: (
        _parent: unknown,
        args: RegisterArgs,
      ) => registerUser(args.input),
  
      login: (
        _parent: unknown,
        args: LoginArgs,
      ) => loginUser(args.input),
    },
  };