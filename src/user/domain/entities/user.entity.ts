export class UserEntity {
  constructor(
    public id: number | null,
    public name: string,
    private _email: string,
    private _password: string | null,
    private _phoneNumber: string,
    private _refreshToken: string | null,
    public isVerified?: boolean,
  ) {}

  //  Request (creating user)
  static createUserRequest(
    email: string,
    name: string,
    password: string,
    phoneNumber: string,
    refreshToken: string,
    isVerified?: boolean,
  ) {
    return new UserEntity(
      null,
      name,
      email,
      password,
      phoneNumber,
      refreshToken,
      isVerified,
    );
  }

  //  Response (no password)
  static createUserResponse(
    id: number,
    email: string,
    name: string,
    phoneNumber: string,
    refreshToken: string,
    isVerified?: boolean,
  ) {
    return new UserEntity(
      id,
      name,
      email,
      null,
      phoneNumber,
      refreshToken,
      isVerified,
    );
  }

  get idValue() {
    return this.id;
  }

  get email() {
    return this._email;
  }
  get password() {
    return this._password;
  }
  get number() {
    return this._phoneNumber;
  }
  get refreshToken() {
    return this._refreshToken;
  }
}
